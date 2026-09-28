import { one } from './db';
import { env, selfUrl } from './env';
import { log } from './evidence';
import { getAudit, patchAudit, type AuditRow } from './audits';
import { STEPS } from './engine/steps';
import { resetSpent, spent } from './collectors/dataforseo';

// Runs one step of an audit under a database lock, then asks for the next step to be run in a
// fresh invocation. A cron job every few minutes restarts anything that stalled.

export const jobSecret = () => env.cronSecret || env.appPassword || 'local-dev-secret';
const MAX_ATTEMPTS = 3;

async function acquire(id: string): Promise<AuditRow | null> {
  return one<AuditRow>(
    `update audits set locked_until = now() + interval '11 minutes' where id = $1 and status = 'running' and step is not null and (locked_until is null or locked_until < now()) returning *`,
    [id],
  );
}

/** Runs the audit's current step. Returns true if another step should be started. */
export async function runNext(id: string): Promise<boolean> {
  const a = await acquire(id);
  if (!a) return false;
  const step = a.step!;
  const fn = STEPS[step];
  resetSpent();
  try {
    if (!fn) throw new Error(`Unknown step ${step}`);
    const r = await fn(a);
    const fresh = await getAudit(id);
    const cost = Number(fresh?.cost || 0) + spent;
    if (r.yield) {
      await patchAudit(id, { locked_until: null, cost });
      return true;
    }
    await patchAudit(id, { step: r.next, status: r.status ?? (r.next ? 'running' : 'review'), step_attempts: 0, locked_until: null, error: null, cost });
    return !!r.next && (r.status ?? 'running') === 'running';
  } catch (e: any) {
    const attempts = a.step_attempts + 1;
    const msg = String(e?.message || e).slice(0, 500);
    await log(id, `Step "${step}" failed (attempt ${attempts} of ${MAX_ATTEMPTS}): ${msg}`, 'error');
    const failed = attempts >= MAX_ATTEMPTS;
    await patchAudit(id, { step_attempts: attempts, locked_until: null, error: msg, ...(failed ? { status: 'failed' } : {}) });
    return !failed;
  }
}

/** Ask this deployment to run the next step in a new invocation (fire and forget). */
export async function kick(id: string) {
  try {
    await fetch(`${selfUrl()}/api/jobs/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-job-secret': jobSecret() },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch { /* the cron job will pick it up */ }
}
