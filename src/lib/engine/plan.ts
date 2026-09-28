import type { AuditRow } from '../audits';
import { INDUSTRIES } from '../industries';
import type { AgentBrief, CategoryKey, Finding, Plan, PlanItem, Projection, Scores } from '../types';
import { clamp, round } from '../util';

// The 90-day plan and the projection rules. Plan items come from the industry's playbook,
// kept where the business has a gap. Projections are ranges from fixed rules, not predictions
// by the AI model: each category closes a set share of its gap to the competitor median.

export const CLOSE_RATE: Record<CategoryKey, number> = {
  profile: 0.8, video: 0.8, social: 0.7, website: 0.6, map: 0.35, reviews: 0.35, ai: 0.3, rankings: 0.25, links: 0.25, ads: 0,
};
/** Most a category's raw value can grow in 90 days, whatever the gap. */
export const VALUE_CAP: Partial<Record<CategoryKey, { max: number; unit: string }>> = {
  reviews: { max: 30, unit: 'reviews' },
  links: { max: 15, unit: 'linking sites' },
};
const RATE_WHY: Record<CategoryKey, string> = {
  profile: 'profile fixes take effect within weeks', video: 'the agents produce the videos directly', social: 'posting pace is set by the plan',
  website: 'site fixes are done in the first 30 days', map: 'map rank moves slowly with reviews, posts and listings', reviews: 'reviews depend on how many jobs or sales close',
  ai: 'AI assistants pick up new content over months', rankings: 'Google rankings take months to move', links: 'links are earned over time', ads: 'ads are the client\'s budget decision',
};

export function buildPlan(a: AuditRow, s: Scores, findings: Finding[]): Plan {
  const ind = INDUSTRIES[a.inputs.industry];
  const d = a.data;
  const score = (k: CategoryKey) => s.categories.find(c => c.key === k)?.scores.client ?? null;
  const kws = [...(d.keywords || [])].sort((x, y) => (y.volume ?? 0) - (x.volume ?? 0));
  const openVideo = (d.serp || []).filter(x => x.videoRow && !x.videoItems.length).map(x => x.keyword);
  const items: PlanItem[] = [];
  ind.plan.forEach((t, i) => {
    const sc = score(t.category);
    const core = t.category === 'video' || t.category === 'ai' || t.kind !== 'service';
    if (!core && sc != null && sc >= 80) return; // no gap here
    if (t.category === 'website' && sc != null && sc >= 80) return;
    const targets = t.preset === 'question' ? d.questions || []
      : t.preset === 'area' ? kws.filter(k => k.kind !== 'near_me').slice(0, 6).map(k => k.term)
      : /Articles|Moments/.test(t.by) ? undefined
      : t.category === 'video' ? [...new Set([...openVideo, ...kws.map(k => k.term)])].slice(0, 6)
      : t.category === 'rankings' || t.category === 'map' ? kws.slice(0, 6).map(k => k.term) : undefined;
    items.push({ id: `p${i + 1}`, category: t.category, action: t.action, deliveredBy: { kind: t.kind, name: t.by }, preset: t.preset, platforms: t.platforms, cadence: t.cadence, metric: t.metric, phase: t.phase, targets });
  });
  for (const f of findings) f.planItems = items.filter(it => it.category === f.category).map(it => it.id);

  const planned = new Set(items.map(i => i.category));
  const projections: Projection[] = s.categories.map(c => {
    const cur = c.scores.client ?? null;
    const rate = planned.has(c.key) ? CLOSE_RATE[c.key] : 0;
    if (cur == null) return { category: c.key, current: null, low: null, high: null, mid: null, rule: 'Not checked, so not projected.' };
    // Reviews and links grow by count, not by share: cap what 90 days can add.
    const cap = VALUE_CAP[c.key];
    const v = c.values.client, med = c.median;
    if (cap && rate && v != null && med) {
      const add = (k: number) => Math.min(cap.max * Math.min(1, k), rate * k * Math.max(0, med - v));
      const sc = (k: number) => clamp(Math.round(((v + add(k)) / med) * 100));
      return { category: c.key, current: cur, low: Math.max(cur, sc(0.6)), mid: Math.max(cur, sc(1)), high: Math.max(cur, sc(1.3)), rule: `Adds up to ${cap.max} ${cap.unit} in 90 days (about ${Math.round(rate * 100)}% of the gap to the competitor median, whichever is smaller), because ${RATE_WHY[c.key]}.` };
    }
    const gap = 100 - cur;
    const mid = clamp(Math.round(cur + rate * gap)), low = clamp(Math.round(cur + rate * 0.6 * gap)), high = clamp(Math.round(cur + Math.min(1, rate * 1.3) * gap));
    return { category: c.key, current: cur, low, high, mid, rule: rate ? `Closes about ${Math.round(rate * 100)}% of the gap to the competitor median in 90 days (range ${Math.round(rate * 60)}-${Math.round(Math.min(1, rate * 1.3) * 100)}%), because ${RATE_WHY[c.key]}.` : `No change projected: ${planned.has(c.key) ? RATE_WHY[c.key] : 'no plan item for this category'}.` };
  });

  // Agent briefs: what each agent or preset should make, for which searches and questions.
  const briefs = new Map<string, AgentBrief>();
  for (const it of items.filter(i => i.deliveredBy.kind !== 'service' && i.deliveredBy.kind !== 'client')) {
    const key = it.deliveredBy.name + (it.preset ? `:${it.preset}` : '');
    const b = briefs.get(key) || { agent: it.deliveredBy.name, preset: it.preset, kind: it.deliveredBy.kind, targets: [], titles: [], platforms: [], cadence: it.cadence || 'weekly' };
    for (const t of it.targets || []) if (!b.targets.includes(t)) b.targets.push(t);
    for (const p of it.platforms) if (!b.platforms.includes(p)) b.platforms.push(p);
    briefs.set(key, b);
  }
  for (const b of briefs.values()) {
    b.titles = b.targets.slice(0, 6).map(t => b.preset === 'question' ? t : titleFor(t, a.name, d.city || ''));
  }
  const ongoing = [
    'Keep the monthly posting pace for each agent set in the 90-day plan.',
    'Re-run the audit every month; next month\'s work goes to the highest-weighted categories still below the competitor median.',
    'Refresh the tracked searches and buyer questions each quarter from new search data.',
    'Quarterly review with the client: planned against actual on the same map, and new targets.',
  ];
  return { items, projections, ongoing, agentBriefs: [...briefs.values()], salesMetrics: ind.salesMetrics };
}

function titleFor(term: string, name: string, city: string) {
  const t = term.replace(/\bnear me\b/, `in ${city}`).trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + ` | ${name}`;
}

export { round };
