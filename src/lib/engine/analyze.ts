import { getAudit, identities, patchAudit, type AuditRow } from '../audits';
import { evidenceIndex } from '../evidence';
import type { Results } from '../types';
import { buildBrief } from './brief';
import { buildFindings } from './findings';
import { buildPlan } from './plan';
import { buildReport, defaultScene } from './report';
import { computeMetrics, scoreAll } from './score';

// Scoring, findings, plan, brief and report. Runs after collection, and again whenever Nick
// enters social numbers or changes review settings (no API calls, so it is cheap to repeat).

export async function analyze(a0: AuditRow, opts: { skipAi?: boolean } = {}): Promise<Results> {
  const a = (await getAudit(a0.id)) || a0;
  const ids = identities(a).filter(i => a.data.brands[i.id]);
  const m = computeMetrics(a, ids);
  const scores = scoreAll(a, ids, m);
  const findings = buildFindings(a, ids, scores, m);
  const plan = buildPlan(a, scores, findings);
  const hidden = new Set(a.overrides?.hiddenFindings || []);
  const edits = a.overrides?.findingText || {};
  for (const f of findings) { if (edits[f.id]?.title) f.title = edits[f.id].title!; if (edits[f.id]?.detail) f.detail = edits[f.id].detail!; }
  const shownFindings = findings.filter(f => !hidden.has(f.id));
  const prevBrief = a.results?.brief;
  const brief = opts.skipAi && prevBrief ? prevBrief : await buildBrief(a, ids, scores, shownFindings, plan, m);
  const ev = await evidenceIndex(a.id);
  const report = buildReport(a, ids, scores, plan, m, ev, !!a.overrides?.anonymize, a.overrides?.scene || defaultScene(a.inputs.industry));

  const thin: string[] = [];
  for (const c of scores.categories) {
    if (!c.checked) thin.push(`${c.label}: not checked${c.key === 'social' ? ' (enter the social numbers by hand)' : ''}.`);
    const compsMissing = ids.filter(i => i.id !== 'client' && c.values[i.id] == null).length;
    if (c.checked && compsMissing) thin.push(`${c.label}: ${compsMissing} competitor(s) had no data, so the median uses fewer businesses.`);
  }
  if (a.sample) thin.unshift('This audit uses SAMPLE data. Add the API keys in Vercel before showing it to a prospect.');
  if (ids.length < 4) thin.push(`Only ${ids.length - 1} competitor(s) confirmed; scores compare against fewer businesses.`);

  const results: Results = { scores, findings, plan, brief, report, checks: { thin, dropped: brief.dropped }, computedAt: new Date().toISOString() };
  await patchAudit(a.id, { results });
  return results;
}
