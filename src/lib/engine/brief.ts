import type { AuditRow, Ident } from '../audits';
import { askJson } from '../ai/model';
import { factSet, filterText } from '../ai/validate';
import { hasAnthropic } from '../env';
import { INDUSTRIES } from '../industries';
import type { Brief, Finding, Plan, Scores } from '../types';
import type { Metrics } from './score';

// The strategy brief is for Nick only: headline, talking points, likely objections and what to offer.
// Rules write a complete brief; the AI model may then reword the talking points and answers,
// and every sentence it writes goes through the fact check.

export async function buildBrief(a: AuditRow, ids: Ident[], s: Scores, findings: Finding[], plan: Plan, m: Metrics): Promise<Brief> {
  const ind = INDUSTRIES[a.inputs.industry];
  const comps = ids.filter(i => i.id !== 'client');
  const topComp = comps.map(c => ({ c, v: s.overall[c.id] ?? 0 })).sort((x, y) => y.v - x.v)[0];
  const headline = `${a.name} scores ${s.overall.client ?? 'n/a'} of 100 on presence; ${topComp?.c.name ?? 'the top competitor'} scores ${topComp?.v ?? 'n/a'}.`;
  const top = findings.filter(f => f.severity !== 'low').slice(0, 4);
  const talkingPoints = top.map(f => `${f.title}. ${f.detail}`);
  const videoRows = (a.data.serp || []).filter(x => x.videoRow).length;
  const objections = [
    { objection: 'We already get most of our business from referrals.', answer: `Referred buyers still look the business up. Today AI assistants name ${a.name} in ${m.aiNamed.client || 0} of ${m.aiTotal} answers to buyer questions, so a referral who checks online meets competitors first.` },
    { objection: 'Video is expensive and we do not have time to film.', answer: `The agents build videos from photos and listing links the business already has. Google shows a video row on ${videoRows} of the ${(a.data.serp || []).length} main searches.` },
    { objection: 'We tried social media and it did not bring in sales.', answer: 'The plan ties every video to a search buyers already make, and each month the audit re-runs to show which searches moved.' },
    { objection: `How do we know this will work for a ${ind.role}?`, answer: `The 90-day plan projects a range for each category, and results are measured monthly on ${ind.salesMetrics.join(', ').toLowerCase()} as well as visibility.` },
  ];
  const offer = {
    agents: [...new Set(plan.items.filter(i => i.deliveredBy.kind === 'ready').map(i => i.deliveredBy.name))],
    build: [...new Set(plan.items.filter(i => i.deliveredBy.kind === 'build' || i.deliveredBy.kind === 'adapt').map(i => i.deliveredBy.name + (i.preset ? ` (${i.preset} preset)` : '')))],
    services: [...new Set(plan.items.filter(i => i.deliveredBy.kind === 'service').map(i => i.action))],
  };
  const brief: Brief = { headline, talkingPoints, objections, offer, generatedBy: 'rules', dropped: [] };
  if (!hasAnthropic()) return brief;

  const facts = factSet([s.overall, findings.map(f => [f.title, f.detail, f.facts]), m.aiNamed, m.aiTotal, videoRows, (a.data.serp || []).length, a.market],
    [a.name, a.market, a.data.city || '', ...comps.map(c => c.name), ind.label, ...ind.salesMetrics, ...offer.agents, ...offer.build]);
  const res = await askJson<{ talkingPoints: string[]; answers: string[] }>(
    'You help a sales lead prepare for a meeting with a local business. Rewrite the talking points and objection answers to be direct, plain and persuasive for a business owner. Use only the numbers and names given. Do not add new facts, numbers, names, guarantees or percentages.',
    JSON.stringify({ business: a.name, talkingPoints, objections }) + '\nReturn {"talkingPoints": [same count], "answers": [one per objection, same order]}.',
  ).catch(() => null);
  if (!res) return brief;
  const dropped: string[] = [];
  const clean = (t: string, fallback: string) => { const r = filterText(t || '', facts); dropped.push(...r.dropped); return r.text.length > 20 ? r.text : fallback; };
  brief.talkingPoints = talkingPoints.map((t, i) => clean(res.talkingPoints?.[i], t));
  brief.objections = objections.map((o, i) => ({ ...o, answer: clean(res.answers?.[i], o.answer) }));
  brief.generatedBy = 'rules+ai';
  brief.dropped = dropped;
  return brief;
}
