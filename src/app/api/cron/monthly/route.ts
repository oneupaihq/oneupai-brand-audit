import { q } from '@/lib/db';
import { env } from '@/lib/env';
import { createAudit, type AuditRow } from '@/lib/audits';
import { kick } from '@/lib/jobs';

// Daily: for every won client, start a fresh audit once 30 days have passed since the last one.
// It keeps the original competitors, so each month compares against the same businesses.
export const maxDuration = 60;

export async function GET(req: Request) {
  if (env.cronSecret && req.headers.get('authorization') !== `Bearer ${env.cronSecret}`) return new Response('Forbidden', { status: 403 });
  const roots = await q<AuditRow>(`select * from audits where outcome = 'won' and parent_id is null`);
  let started = 0;
  for (const root of roots) {
    const last = await q<{ created_at: string }>(`select created_at from audits where id = $1 or parent_id = $1 order by created_at desc limit 1`, [root.id]);
    if (last[0] && Date.now() - new Date(last[0].created_at).getTime() < 30 * 86400_000) continue;
    const child = await createAudit({ ...root.inputs, tier: 'full' }, root.id);
    await kick(child.id);
    started++;
  }
  return Response.json({ started });
}
