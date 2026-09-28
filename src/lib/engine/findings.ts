import type { AuditRow, Ident } from '../audits';
import type { BrandId, CategoryKey, Finding, Scores } from '../types';
import { fmtNum, median } from '../util';
import type { Metrics } from './score';

// Findings come from rules. Each has the facts it states and the evidence behind them.
// The wording here is plain and complete; the AI model may reword it later, under the fact check.

export function buildFindings(a: AuditRow, ids: Ident[], s: Scores, m: Metrics): Finding[] {
  const d = a.data;
  const f: Finding[] = [];
  const name = (id: BrandId) => ids.find(i => i.id === id)?.name || id;
  const comps = ids.filter(i => i.id !== 'client');
  const cat = (k: CategoryKey) => s.categories.find(c => c.key === k)!;
  const sev = (score: number | null | undefined): Finding['severity'] => (score == null ? 'low' : score < 40 ? 'high' : score < 80 ? 'medium' : 'low');
  const leader = (vals: Partial<Record<BrandId, number | null>>) => comps.map(c => ({ id: c.id, v: vals[c.id] ?? -1 })).sort((x, y) => y.v - x.v)[0];
  const add = (x: Omit<Finding, 'planItems'>) => f.push({ ...x, planItems: [] });

  // Map
  const mc = cat('map');
  if (mc.checked && m.mapTotal) {
    const mine = m.mapCells.client || 0;
    const L = leader(m.mapCells as any);
    add({ id: 'map-share', category: 'map', severity: sev(mc.scores.client), title: `Top 3 on the Google map in ${mine} of ${m.mapTotal} checks across ${a.market}`,
      detail: `The map was checked at ${d.maps!.points.length} points across the area for ${d.maps!.keywords.map(k => `"${k}"`).join(' and ')}. ${name(L.id)} is in the top 3 in ${L.v} of ${m.mapTotal}.`,
      facts: { mine, total: m.mapTotal, leader: name(L.id), leaderCells: L.v, points: d.maps!.points.length }, evidence: mc.evidence.slice(0, 10) });
  }
  // Google profile
  const pp = m.profilePts.client;
  if (pp) {
    const pl = d.brands.client?.place;
    if (!pl) add({ id: 'profile-missing', category: 'profile', severity: 'high', title: 'No Google profile was found for the business', detail: `Searching Google Maps for "${a.name}" in ${a.market} did not return a matching profile. Without one, the business cannot appear on the map.`, facts: {}, evidence: [] });
    else if (pp.missing.length) add({ id: 'profile-gaps', category: 'profile', severity: pp.missing.length >= 3 ? 'high' : 'medium', title: `The Google profile is missing ${pp.missing.length} of 7 essentials`, detail: `Missing: ${pp.missing.join(', ')}. Photos on the profile: ${pl.photos ?? 0}.`, facts: { missing: pp.missing.length, photos: pl.photos ?? 0 }, evidence: pl.evidence ? [pl.evidence] : [] });
  }
  // Reviews
  const rc = cat('reviews');
  const myR = d.brands.client?.place?.reviews ?? null;
  if (rc.checked && myR != null) {
    const revs = comps.map(c => ({ id: c.id, r: d.brands[c.id]?.place?.reviews ?? null })).filter(x => x.r != null) as { id: BrandId; r: number }[];
    const top = revs.sort((x, y) => y.r - x.r)[0];
    const med = median(revs.map(x => x.r));
    if (top && myR < (med ?? 0)) add({ id: 'reviews-gap', category: 'reviews', severity: myR < top.r * 0.25 ? 'high' : 'medium', title: `${fmtNum(myR)} Google reviews; the competitor median is ${fmtNum(med)}`,
      detail: `${name(top.id)} has ${fmtNum(top.r)} reviews. The business's rating is ${d.brands.client?.place?.rating ?? 'not shown'}. Review volume is one of the strongest map ranking signals.`,
      facts: { mine: myR, median: med ?? 0, leader: name(top.id), leaderReviews: top.r, rating: d.brands.client?.place?.rating ?? 0 }, evidence: rc.evidence.slice(0, 4) });
  }
  // Website
  const site = d.brands.client?.site, sp = d.brands.client?.speed;
  if (sp?.performance != null && sp.performance < 50) add({ id: 'site-speed', category: 'website', severity: sp.performance < 30 ? 'high' : 'medium', title: `Mobile speed score is ${sp.performance} of 100`, detail: `Google's PageSpeed test scores the website ${sp.performance} on mobile. Slow pages lose visitors before they call.`, facts: { speed: sp.performance }, evidence: [sp.evidence] });
  if (site?.ok) {
    const miss = [!site.hasPhoneLink && 'a tap-to-call phone link', !site.hasSchemaLocalBusiness && 'business schema for search engines', !site.mentionsCity && `a mention of ${d.city}`, !site.hasFaq && 'an FAQ answering buyer questions', site.videoEmbeds === 0 && 'video'].filter(Boolean) as string[];
    if (miss.length >= 2) add({ id: 'site-onpage', category: 'website', severity: miss.length >= 4 ? 'high' : 'medium', title: `The website is missing ${miss.length} of 5 basics`, detail: `Missing on the pages read: ${miss.join(', ')}.`, facts: { missing: miss.length, pages: site.pages.length }, evidence: [site.evidence] });
  } else if (site && !site.ok) add({ id: 'site-down', category: 'website', severity: 'high', title: 'The website could not be read', detail: `The audit could not load ${a.website}. Check that it is online and not blocking visitors.`, facts: {}, evidence: [site.evidence] });
  // Search rankings
  const serp = d.serp || [];
  if (serp.length) {
    const kws = d.keywords || [];
    const inTop10 = serp.filter(s => s.organic.some(o => o.rank <= 10 && ids[0].domain && o.domain.endsWith(ids[0].domain))).length;
    const missed = kws.filter(k => { const s = serp.find(x => x.keyword === k.term); return s && !s.organic.some(o => o.rank <= 10 && ids[0].domain && o.domain.endsWith(ids[0].domain)); }).sort((x, y) => (y.volume ?? 0) - (x.volume ?? 0))[0];
    add({ id: 'rankings', category: 'rankings', severity: sev(cat('rankings').scores.client), title: `On Google's first page for ${inTop10} of ${serp.length} main searches`,
      detail: missed ? `The biggest miss is "${missed.term}", searched about ${fmtNum(missed.volume)} times a month near ${d.city}.` : 'The business ranks on the first page for every tracked search.',
      facts: { inTop10, total: serp.length, missedVolume: missed?.volume ?? 0 }, evidence: serp.slice(0, 6).map(s => s.evidence) });
  }
  // Video
  const vc = cat('video');
  const up = m.uploads12.client;
  const videoRows = serp.filter(s => s.videoRow).length;
  if (vc.checked || videoRows) {
    const topYt = (d.ytSerp || []).flatMap(y => y.videos.map(v => ({ ...v, kw: y.keyword }))).filter(v => comps.some(c => d.brands[c.id]?.youtube?.title && v.channel.toLowerCase() === d.brands[c.id]!.youtube!.title.toLowerCase())).sort((x, y) => (y.views ?? 0) - (x.views ?? 0))[0];
    add({ id: 'video', category: 'video', severity: sev(vc.scores.client), title: up ? `${up} YouTube uploads in the last 12 months` : 'No YouTube uploads in the last 12 months',
      detail: `Google shows a video row for ${videoRows} of ${serp.length} main searches; the business owns ${m.videoOwned.client || 0} of those video results.` + (topYt ? ` A competitor video for "${topYt.kw}" has ${fmtNum(topYt.views)} views.` : ''),
      facts: { uploads: up ?? 0, videoRows, total: serp.length, owned: m.videoOwned.client || 0, ...(topYt ? { topViews: topYt.views ?? 0 } : {}) }, evidence: vc.evidence.slice(0, 8) });
  }
  // AI assistants
  if (m.aiTotal) {
    const L = leader(m.aiNamed as any);
    const per = (['chatgpt', 'claude', 'gemini'] as const).map(as => { const xs = (d.ai || []).filter(x => x.assistant === as); return `${as === 'chatgpt' ? 'ChatGPT' : as === 'claude' ? 'Claude' : 'Gemini'} ${xs.filter(x => x.mentions.includes('client')).length} of ${xs.length}`; });
    add({ id: 'ai', category: 'ai', severity: sev(cat('ai').scores.client), title: `Named in ${m.aiNamed.client || 0} of ${m.aiTotal} AI answers to buyer questions`,
      detail: `By assistant: ${per.join(', ')}. ${name(L.id)} is named in ${L.v < 0 ? 0 : L.v}. Answers include Google's AI answers where a search showed one.`,
      facts: { mine: m.aiNamed.client || 0, total: m.aiTotal, leader: name(L.id), leaderNamed: Math.max(0, L.v) }, evidence: cat('ai').evidence.slice(0, 12) });
  }
  // Social (entered by hand)
  const sc = cat('social');
  if (sc.checked) {
    const med = median(comps.map(c => m.posts90[c.id]).filter((x): x is number => x != null));
    if ((m.posts90.client ?? 0) < (med ?? 0)) add({ id: 'social', category: 'social', severity: sev(sc.scores.client), title: `${m.posts90.client ?? 0} social posts in the last 90 days; competitor median ${med}`, detail: 'Counted by hand on Instagram, TikTok, Facebook and LinkedIn from public profiles.', facts: { mine: m.posts90.client ?? 0, median: med ?? 0 }, evidence: [] });
  }
  // Links
  const lc = cat('links');
  if (lc.checked && (lc.values.client ?? 0) < (lc.median ?? 0)) add({ id: 'links', category: 'links', severity: sev(lc.scores.client), title: `${fmtNum(lc.values.client)} sites link to the business; the competitor median is ${fmtNum(lc.median)}`, detail: 'Links from other sites help Google trust a business.', facts: { mine: lc.values.client ?? 0, median: lc.median ?? 0 }, evidence: lc.evidence });
  // Ads
  const ac = cat('ads');
  if (ac.checked) {
    const theirs = comps.reduce((s2, c) => s2 + (m.paid[c.id] || 0), 0);
    if (theirs > 0 && !(m.paid.client)) add({ id: 'ads', category: 'ads', severity: 'low', title: `Competitors run search ads on ${theirs} of the tracked searches; the business runs none`, detail: 'Counted from the ads Google showed on the tracked searches.', facts: { theirs }, evidence: ac.evidence.slice(0, 4) });
  }
  // Content review
  const cr = d.contentReview;
  if (cr?.checks?.length) {
    const fails = cr.checks.filter(c => c.result === 'fail');
    if (fails.length) add({ id: 'content', category: 'website', severity: fails.length >= 3 ? 'high' : 'medium', title: `Content review: ${fails.length} of ${cr.checks.length} checks failed`, detail: `Failed: ${fails.map(x => x.item).join(', ')}.`, facts: { fails: fails.length, total: cr.checks.length }, evidence: [cr.evidence].filter(Boolean) });
  }
  const order = { high: 0, medium: 1, low: 2 };
  return f.sort((x, y) => order[x.severity] - order[y.severity]);
}
