import type { AuditRow, Ident } from '../audits';
import { whoIs } from '../audits';
import { INDUSTRIES } from '../industries';
import type { BrandId, CategoryKey, CategoryResult, Collected, Scores, SocialKey } from '../types';
import { clamp, median, round, sameSite } from '../util';

// Scoring. Each category measures one raw value per business. A business's score is its value
// divided by the competitors' median value, times 100, capped at 100. Overall is the weighted
// average of the categories that were checked. Nothing here is estimated by the AI model.

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  map: 'Map & local search', profile: 'Google profile', reviews: 'Reviews', website: 'Website', rankings: 'Search rankings',
  video: 'Video', ai: 'AI assistants', social: 'Social', links: 'Sites linking in', ads: 'Paid ads',
};
export const CATEGORY_ORDER: CategoryKey[] = ['map', 'profile', 'reviews', 'website', 'rankings', 'video', 'ai', 'social', 'links', 'ads'];

export interface Metrics {
  mapShare: Partial<Record<BrandId, number | null>>;
  mapCells: Partial<Record<BrandId, number>>;
  mapTotal: number;
  profilePts: Partial<Record<BrandId, { pts: number; missing: string[] } | null>>;
  top10: Partial<Record<BrandId, number>>;
  top3: Partial<Record<BrandId, number>>;
  videoOwned: Partial<Record<BrandId, number>>;
  ytAppear: Partial<Record<BrandId, number>>;
  uploads12: Partial<Record<BrandId, number | null>>;
  aiNamed: Partial<Record<BrandId, number>>;
  aiTotal: number;
  paid: Partial<Record<BrandId, number>>;
  posts90: Partial<Record<BrandId, number | null>>;
  followers: Partial<Record<BrandId, number | null>>;
}

export function brandsPresent(ids: Ident[], d: Collected) { return ids.filter(i => d.brands[i.id]); }

export function computeMetrics(a: AuditRow, ids: Ident[]): Metrics {
  const d = a.data;
  const m: Metrics = { mapShare: {}, mapCells: {}, mapTotal: 0, profilePts: {}, top10: {}, top3: {}, videoOwned: {}, ytAppear: {}, uploads12: {}, aiNamed: {}, aiTotal: 0, paid: {}, posts90: {}, followers: {} };
  const bids = ids.map(i => i.id);
  // Map grid: share of (point x keyword) checks with the business in the top 3
  const pts = d.maps?.points || [];
  for (const p of pts) for (const [, top] of Object.entries(p.top3)) {
    m.mapTotal++;
    for (const t of top) { const w = whoIs(ids, t); if (w) m.mapCells[w] = (m.mapCells[w] || 0) + 1; }
  }
  for (const id of bids) m.mapShare[id] = m.mapTotal ? round(((m.mapCells[id] || 0) / m.mapTotal) * 100, 1) : null;
  // Google profile completeness
  for (const id of bids) {
    const pl = d.brands[id]?.place;
    if (pl === undefined) { m.profilePts[id] = null; continue; }
    if (!pl) { m.profilePts[id] = { pts: 0, missing: ['a Google profile'] }; continue; }
    const checks: [boolean, string][] = [[!!pl.website, 'a website link'], [!!pl.phone, 'a phone number'], [!!pl.hasHours, 'opening hours'], [!!pl.description, 'a description'], [(pl.photos || 0) >= 10, '10 or more photos'], [(pl.rating || 0) >= 4.5, 'a rating of 4.5 or higher'], [!!pl.category, 'a business category']];
    m.profilePts[id] = { pts: checks.filter(c => c[0]).length, missing: checks.filter(c => !c[0]).map(c => c[1]) };
  }
  // Search rankings, paid ads and Google's video row
  const kwVol = new Map((d.keywords || []).map(k => [k.term, k.volume ?? 0]));
  for (const s of d.serp || []) {
    const vol = kwVol.get(s.keyword) || 0;
    const seen = new Set<BrandId>();
    for (const o of s.organic) {
      const w = whoIs(ids, { domain: o.domain });
      if (!w || seen.has(w)) continue;
      seen.add(w);
      if (o.rank <= 10) m.top10[w] = (m.top10[w] || 0) + vol * (o.rank <= 3 ? 1 : 0.5);
      if (o.rank <= 3) m.top3[w] = (m.top3[w] || 0) + 1;
    }
    for (const pd of s.paidDomains) { const w = whoIs(ids, { domain: pd }); if (w) m.paid[w] = (m.paid[w] || 0) + 1; }
    for (const v of s.videoItems) { const w = videoOwner(ids, d, v); if (w) m.videoOwned[w] = (m.videoOwned[w] || 0) + 1; }
  }
  for (const y of d.ytSerp || []) for (const v of y.videos.slice(0, 10)) {
    const w = ids.find(i => i.name && v.channel && (v.channel.toLowerCase() === i.name.toLowerCase() || d.brands[i.id]?.youtube?.title?.toLowerCase() === v.channel.toLowerCase()))?.id;
    if (w) m.ytAppear[w] = (m.ytAppear[w] || 0) + 1;
  }
  for (const id of bids) { const yt = d.brands[id]?.youtube; m.uploads12[id] = yt === undefined ? null : yt ? yt.uploads12.reduce((x, y) => x + y, 0) : 0; }
  // AI assistants (plus Google's AI answers when a search shows one)
  const answers = d.ai || [];
  m.aiTotal = answers.length;
  for (const an of answers) for (const id of an.mentions) m.aiNamed[id] = (m.aiNamed[id] || 0) + 1;
  for (const s of d.serp || []) if (s.aiOverview.present) {
    m.aiTotal++;
    for (const id of bids) { const dom = d.brands[id]?.domain; if (dom && s.aiOverview.refDomains.some(r => sameSite(r, dom))) m.aiNamed[id] = (m.aiNamed[id] || 0) + 1; }
  }
  // Social: entered by hand
  for (const id of bids) {
    const man = a.manual?.[id];
    const entries = man ? Object.values(man).filter(Boolean) : [];
    if (!entries.length) { m.posts90[id] = null; m.followers[id] = null; continue; }
    m.posts90[id] = entries.reduce((s, e) => s + (e!.posts90 || 0), 0);
    m.followers[id] = entries.reduce((s, e) => s + (e!.followers || 0), 0);
  }
  return m;
}

export function videoOwner(ids: Ident[], d: Collected, v: { title: string; url: string }): BrandId | null {
  const vid = v.url.match(/[?&]v=([\w-]{6,})|youtu\.be\/([\w-]{6,})|shorts\/([\w-]{6,})/);
  const id = vid?.[1] || vid?.[2] || vid?.[3];
  if (id) for (const i of ids) if (d.brands[i.id]?.youtube?.recentIds?.includes(id)) return i.id;
  return whoIs(ids, { title: v.title });
}

export function scoreAll(a: AuditRow, ids: Ident[], m: Metrics): Scores {
  const d = a.data;
  const ind = INDUSTRIES[a.inputs.industry];
  const bids = ids.map(i => i.id);
  const val: Record<CategoryKey, Partial<Record<BrandId, number | null>>> = { map: {}, profile: {}, reviews: {}, website: {}, rankings: {}, video: {}, ai: {}, social: {}, links: {}, ads: {} };
  const ev: Record<CategoryKey, string[]> = { map: [], profile: [], reviews: [], website: [], rankings: [], video: [], ai: [], social: [], links: [], ads: [] };
  const totalVol = (d.keywords || []).reduce((s, k) => s + (k.volume ?? 0), 0);
  for (const id of bids) {
    const b = d.brands[id];
    val.map[id] = m.mapShare[id] ?? null;
    val.profile[id] = m.profilePts[id] ? round((m.profilePts[id]!.pts / 7) * 100) : null;
    const pl = b?.place;
    val.reviews[id] = pl === undefined ? null : pl ? round((pl.reviews || 0) * ((pl.rating || 0) >= 4.5 ? 1 : (pl.rating || 0) >= 4 ? 0.8 : 0.6)) : 0;
    const site = b?.site, sp = b?.speed;
    if (!sp && !site?.ok) val.website[id] = null;
    else {
      const onPage = site?.ok ? [site.hasPhoneLink, site.hasSchemaLocalBusiness, site.mentionsCity, site.hasFaq, site.videoEmbeds > 0].filter(Boolean).length / 5 : 0;
      val.website[id] = round(0.5 * (sp?.performance ?? 50) + 0.2 * (sp?.seo ?? 70) + 30 * onPage);
    }
    val.rankings[id] = d.serp?.length && totalVol ? round(((m.top10[id] || 0) / totalVol) * 100, 1) : d.serp?.length ? 0 : null;
    const up = m.uploads12[id];
    val.video[id] = up == null && !d.serp?.length ? null : Math.min(52, up || 0) + 5 * ((m.videoOwned[id] || 0) + (m.ytAppear[id] || 0));
    val.ai[id] = m.aiTotal ? round(((m.aiNamed[id] || 0) / m.aiTotal) * 100, 1) : null;
    val.social[id] = m.posts90[id] == null ? null : round((m.posts90[id] || 0) + 2 * Math.log10(1 + (m.followers[id] || 0)), 1);
    val.links[id] = b?.backlinks ? b.backlinks.referringDomains : null;
    val.ads[id] = d.serp?.length ? m.paid[id] || 0 : null;
    if (pl?.evidence) { ev.profile.push(pl.evidence); ev.reviews.push(pl.evidence); }
    if (sp?.evidence) ev.website.push(sp.evidence);
    if (site?.evidence) ev.website.push(site.evidence);
    if (b?.backlinks?.evidence) ev.links.push(b.backlinks.evidence);
    if (b?.youtube?.evidence) ev.video.push(b.youtube.evidence);
  }
  ev.map = [...new Set((d.maps?.points || []).map(p => p.evidence))];
  ev.rankings = (d.serp || []).map(s => s.evidence);
  ev.ads = ev.rankings;
  ev.video.push(...(d.ytSerp || []).map(y => y.evidence), ...ev.rankings);
  ev.ai = (d.ai || []).map(x => x.evidence);
  const units: Record<CategoryKey, string> = {
    map: '% of map checks in the top 3', profile: '% of profile essentials in place', reviews: 'reviews (rating-adjusted)', website: 'speed and on-page score (0-100)',
    rankings: '% of search volume ranked in the top 10', video: 'uploads in 12 months + 5 per video result owned', ai: '% of AI answers naming them',
    social: 'posts in 90 days + follower weight', links: 'sites linking in', ads: 'searches with their ad showing',
  };
  const categories: CategoryResult[] = CATEGORY_ORDER.map(key => {
    const values = val[key];
    const comp = bids.filter(i => i !== 'client').map(i => values[i]).filter((x): x is number => x != null);
    const med = median(comp);
    const scores: Partial<Record<BrandId, number | null>> = {};
    for (const id of bids) {
      const v = values[id];
      scores[id] = v == null || med == null ? null : med === 0 ? (v > 0 ? 100 : 0) : clamp(Math.round((v / med) * 100));
    }
    return { key, label: CATEGORY_LABELS[key], weight: ind.weights[key], checked: values.client != null && med != null, unit: units[key], values, scores, median: med, evidence: [...new Set(ev[key])].slice(0, 40) };
  });
  const overall = {} as Record<BrandId, number | null>;
  for (const id of bids) overall[id] = weighted(categories.map(c => c.scores[id] ?? null), categories.map(c => c.weight));
  return { categories, overall };
}

export function weighted(scores: (number | null)[], weights: number[]) {
  let s = 0, w = 0;
  scores.forEach((v, i) => { if (v != null) { s += v * weights[i]; w += weights[i]; } });
  return w ? Math.round(s / w) : null;
}

export const SOCIAL_KEYS: SocialKey[] = ['instagram', 'tiktok', 'facebook', 'linkedin'];
