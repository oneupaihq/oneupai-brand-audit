import type { AuditRow, Ident } from '../audits';
import { whoIs } from '../audits';
import { INDUSTRIES, fill } from '../industries';
import { PLATFORM_META } from '../platforms';
import type { BrandId, Plan, ReportBrand, ReportData, ReportKeyword, ReportPlatform, ReportStop, Scores } from '../types';
import { fmtNum, initials, median } from '../util';
import { CLOSE_RATE, VALUE_CAP } from './plan';
import { videoOwner, type Metrics } from './score';

// Builds the report contract the 3D page reads. Every sentence here is assembled from computed facts.

const COLORS: Record<BrandId, string> = { client: '#e8a92e', a: '#4a7fe0', b: '#8d69d8', c: '#2fa58d' };

/** Default 3D scene for an industry: yacht brokers get the marina. */
export const defaultScene = (industry: string): 'city' | 'marina' => (industry === 'yacht_broker' ? 'marina' : 'city');

export function buildReport(a: AuditRow, ids: Ident[], s: Scores, plan: Plan, m: Metrics, evidence: ReportData['evidence'], anonymize: boolean, scene: 'city' | 'marina' = 'city'): ReportData {
  const V = scene === 'marina'
    ? { glow: 'Lit portholes, people walking in and gold tiles', store: 'The 12 portholes along the hull are the last 12 months; lit portholes had a YouTube upload. The gangway light shows the website\'s mobile speed score', calendar: 'A weekly video calendar lights every porthole from here on.', crowd: 'The people on each pier are its review count.', links: 'The people walking in are buyers from the tracked searches each business ranks first on. Banners on the promenade are search ads', storeLabel: 'On deck' }
    : { glow: 'Glowing floors, people walking in and gold tiles', store: 'The top 12 floors are the last 12 months; glowing floors had a YouTube upload. The door shows the website\'s mobile speed score', calendar: 'A weekly video calendar lights every floor from here on.', crowd: 'The people outside each tower are its review count.', links: 'The people walking in are buyers from the tracked searches each business ranks first on. Billboards are search ads', storeLabel: 'Storefront' };
  const d = a.data;
  const ind = INDUSTRIES[a.inputs.industry];
  const disp = (id: BrandId) => (id === 'client' ? a.name : anonymize ? `Competitor ${id.toUpperCase()}` : ids.find(i => i.id === id)?.name || `Competitor ${id.toUpperCase()}`);
  const present = ids.map(i => i.id);
  const comps = present.filter(i => i !== 'client');
  const proj = Object.fromEntries(plan.projections.map(p => [p.category, p]));
  const cats = s.categories;

  // ---------------- keywords
  const kws = [...(d.keywords || [])].sort((x, y) => (y.volume ?? 0) - (x.volume ?? 0)).slice(0, 12);
  const keywords: ReportKeyword[] = kws.map(k => {
    const sp = (d.serp || []).find(x => x.keyword === k.term);
    let owner: BrandId | null = null;
    if (sp) {
      for (const l of sp.local) { const w = whoIs(ids, l); if (w) { owner = w; break; } }
      if (!owner) for (const o of sp.organic.filter(o => o.rank <= 10)) { const w = whoIs(ids, { domain: o.domain }); if (w) { owner = w; break; } }
    }
    let vOwner: BrandId | null = null;
    for (const v of sp?.videoItems || []) { const w = videoOwner(ids, d, v); if (w) { vOwner = w; break; } }
    return { term: k.term, volume: k.volume, owner, video: !!sp?.videoRow, videoOwner: vOwner, planOwner: owner, evidence: [k.evidence, sp?.evidence].filter(Boolean) as string[] };
  });
  const rankOf = (term: string) => (d.serp || []).find(x => x.keyword === term)?.organic.find(o => whoIs(ids, { domain: o.domain }) === 'client')?.rank ?? 99;
  const planTargets = new Set(plan.items.flatMap(i => i.targets || []));
  const flipN = Math.max(1, Math.round(CLOSE_RATE.rankings * keywords.filter(k => k.owner !== 'client').length));
  keywords.filter(k => k.owner !== 'client' && ((rankOf(k.term) <= 15) || (k.video && !k.videoOwner)) && planTargets.has(k.term)).slice(0, flipN + 2).forEach(k => { k.planOwner = 'client'; });

  // ---------------- map grid
  const n = d.maps?.n || 5;
  const grid: (BrandId | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
  const firstKw = d.maps?.keywords?.[0] || '';
  for (const p of d.maps?.points || []) {
    const all = Object.values(p.top3).flat();
    const inTop = all.map(t => whoIs(ids, t)).filter(Boolean) as BrandId[];
    let owner: BrandId | null = inTop.includes('client') ? 'client' : null;
    if (!owner) for (const t of p.top3[firstKw] || all) { const w = whoIs(ids, t); if (w) { owner = w; break; } }
    if (p.i < n && p.j < n) grid[p.i][p.j] = owner;
  }
  const cp = d.brands.client?.place;
  let home: [number, number] = [Math.floor(n / 2), Math.floor(n / 2)];
  if (cp?.lat && cp?.lng && d.maps?.points?.length) {
    const best = [...d.maps.points].sort((x, y) => Math.hypot(x.lat - cp.lat!, x.lng - cp.lng!) - Math.hypot(y.lat - cp.lat!, y.lng - cp.lng!))[0];
    home = [best.i, best.j];
  }
  const countIn = (g: (BrandId | null)[][], id: BrandId) => g.flat().filter(x => x === id).length;
  const cur = countIn(grid, 'client');
  const medCells = median(comps.map(c => countIn(grid, c))) ?? 0;
  const target = Math.min(n * n, Math.max(cur + 1, Math.round(cur + CLOSE_RATE.map * Math.max(0, medCells - cur))));
  const planGrid = grid.map(r => [...r]);
  const order = Array.from({ length: n * n }, (_, k) => [Math.floor(k / n), k % n] as [number, number]).sort((x, y) => Math.hypot(x[0] - home[0], x[1] - home[1]) - Math.hypot(y[0] - home[0], y[1] - home[1]));
  let have = cur;
  for (const [i, j] of order) { if (have >= target) break; if (planGrid[i][j] !== 'client') { planGrid[i][j] = 'client'; have++; } }

  // ---------------- AI rows
  const asNames = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' } as const;
  const rows: ReportData['ai']['rows'] = (['chatgpt', 'claude', 'gemini'] as const).map(as => {
    const xs = (d.ai || []).filter(x => x.assistant === as);
    const cnt: Partial<Record<BrandId, number>> = {};
    xs.forEach(x => x.mentions.forEach(id => { cnt[id] = (cnt[id] || 0) + 1; }));
    return { assistant: asNames[as], named: (Object.keys(cnt) as BrandId[]).filter(id => id !== 'client').sort((p, q2) => (cnt[q2] || 0) - (cnt[p] || 0)), clientCount: cnt.client || 0, total: xs.length };
  });
  const aio = (d.serp || []).filter(x => x.aiOverview.present);
  if (aio.length) {
    const cnt: Partial<Record<BrandId, number>> = {};
    for (const x of aio) for (const id of present) { const dom = d.brands[id]?.domain; if (dom && x.aiOverview.refDomains.some(r => r === dom || r.endsWith('.' + dom))) cnt[id] = (cnt[id] || 0) + 1; }
    rows.push({ assistant: "Google's AI answers", named: (Object.keys(cnt) as BrandId[]).filter(id => id !== 'client'), clientCount: cnt.client || 0, total: aio.length });
  }
  const aiProj = proj.ai?.mid != null && cats.find(c => c.key === 'ai')?.median ? Math.round(((proj.ai.mid / 100) * (cats.find(c => c.key === 'ai')!.median as number) / 100) * m.aiTotal) : null;

  // ---------------- brands
  const months = (id: BrandId) => (d.brands[id]?.youtube?.uploads12 || new Array(12).fill(0)).map(v => (v > 0 ? 1 : 0));
  const topVideo = (id: BrandId) => {
    const title = d.brands[id]?.youtube?.title?.toLowerCase();
    const v = (d.ytSerp || []).flatMap(y => y.videos).filter(x => title && x.channel.toLowerCase() === title).sort((x, y) => (y.views ?? 0) - (x.views ?? 0))[0];
    return v ? { label: v.title.slice(0, 34), views: `${fmtNum(v.views)} views` } : null;
  };
  const brands: ReportBrand[] = present.map(id => {
    const b = d.brands[id];
    const paid = m.paid[id] || 0;
    const rb: ReportBrand = {
      id, name: disp(id), color: COLORS[id], client: id === 'client' || undefined,
      scores: cats.map(c => c.scores[id] ?? null), overall: s.overall[id] ?? null, months: months(id),
      reviews: b?.place?.reviews ?? null, rating: b?.place?.rating ?? null, domains: b?.backlinks?.referringDomains ?? null,
      ads: paid ? { n: paid, video: 0 } : null, speed: b?.speed?.performance ?? null, screen: id === 'client' ? null : topVideo(id),
    };
    if (id === 'client') {
      const med = (k: 'reviews' | 'domains') => median(comps.map(c => (k === 'reviews' ? d.brands[c]?.place?.reviews : d.brands[c]?.backlinks?.referringDomains)).filter((x): x is number => x != null));
      const grow = (v: number | null, md: number | null, rate: number, max: number) => (v == null ? null : md != null && md > v ? Math.round(v + Math.min(max, rate * (md - v))) : v);
      const pScores = cats.map(c => proj[c.key]?.mid ?? c.scores.client ?? null);
      rb.proposed = {
        scores: pScores, overall: weightedOverall(pScores, cats.map(c => c.weight)), months: [...rb.months.slice(3), 1, 1, 1],
        reviews: grow(rb.reviews, med('reviews'), CLOSE_RATE.reviews, VALUE_CAP.reviews!.max), domains: grow(rb.domains, med('domains'), CLOSE_RATE.links, VALUE_CAP.links!.max),
        speed: rb.speed == null ? null : Math.max(rb.speed, plan.items.some(i => i.category === 'website') ? 80 : rb.speed), ads: null,
      };
    }
    return rb;
  });

  // ---------------- platforms
  const planPlatforms = new Set(plan.items.flatMap(i => i.platforms.map(p => p.toLowerCase())));
  const manual = (id: BrandId, k: string) => (a.manual?.[id] as any)?.[k] as { posts90?: number | null; followers?: number | null } | undefined;
  const socialStatus = (id: BrandId, k: string): ReportPlatform['status'] => { const e = manual(id, k); if (!e) return 'unknown'; return (e.posts90 || 0) > 0 ? 'active' : (e.followers || 0) > 0 ? 'weak' : 'none'; };
  const ytStatus = (id: BrandId): ReportPlatform['status'] => { const yt = d.brands[id]?.youtube; if (yt === undefined) return 'unknown'; if (!yt) return 'none'; return yt.uploads12.slice(-3).some(x => x > 0) ? 'active' : 'weak'; };
  const city = d.city || '';
  const svc = (a.inputs.services?.[0] || ind.services[0] || ind.role);
  const firstPlan = (p: string) => plan.items.find(i => i.platforms.some(x => x.toLowerCase().startsWith(p)));
  const platforms: ReportPlatform[] = PLATFORM_META.map(pm => {
    let status: ReportPlatform['status'] = 'unknown', compIds: BrandId[] = [], note = '';
    const id = pm.id;
    if (id === 'google') {
      const pl = d.brands.client?.place;
      const sc = cats.find(c => c.key === 'profile')?.scores.client;
      status = pl ? ((sc ?? 0) >= 80 ? 'active' : 'weak') : pl === null ? 'none' : 'unknown';
      compIds = comps.filter(c => d.brands[c]?.place);
      note = `Top 3 on the map in ${m.mapCells.client || 0} of ${m.mapTotal} checks.`;
    } else if (id === 'youtube') {
      status = ytStatus('client'); compIds = comps.filter(c => ytStatus(c) === 'active');
      note = `${m.uploads12.client ?? 0} uploads in the last 12 months.`;
    } else if (id === 'chatgpt') {
      const rate = m.aiTotal ? (m.aiNamed.client || 0) / m.aiTotal : 0;
      status = !m.aiTotal ? 'unknown' : rate >= 0.2 ? 'active' : rate > 0 ? 'weak' : 'none';
      compIds = comps.filter(c => (m.aiNamed[c] || 0) > 0);
      note = `Named in ${m.aiNamed.client || 0} of ${m.aiTotal} answers from ChatGPT, Claude, Gemini and Google's AI answers.`;
    } else if (['instagram', 'tiktok', 'facebook', 'linkedin'].includes(id)) {
      status = socialStatus('client', id); compIds = comps.filter(c => socialStatus(c, id) === 'active');
      const e = manual('client', id);
      note = e ? `${fmtNum(e.followers ?? null)} followers, ${e.posts90 ?? 0} posts in the last 90 days (counted by hand).` : 'Not checked yet: counted by hand from public profiles.';
    } else note = 'Not checked in this audit.';
    const fit = ind.platformFit[id] || 'Low';
    const inPlan = planPlatforms.has(id) || (id === 'google' && planPlatforms.has('google')) || (id === 'chatgpt' && (planPlatforms.has('chatgpt') || planPlatforms.has('claude')));
    const planStatus: ReportPlatform['status'] = inPlan && fit !== 'Low' ? 'active' : status;
    const content = (ind.platformContent[id] || []).map(x => fill(x, city, svc));
    if (id === 'google') content.splice(0, content.length, ...keywords.slice(0, 3).map(k => k.term));
    if (id === 'chatgpt') content.splice(0, content.length, ...(d.questions || []).slice(0, 2));
    const fp = firstPlan(id === 'chatgpt' ? 'chatgpt' : id);
    return { id, name: pm.name, users: pm.users, usersLabel: pm.usersLabel, color: pm.color, status, planStatus, fit, comps: compIds, content, kind: pm.kind, note, fix: fp ? `${fp.action} (${fp.deliveredBy.name}${fp.preset ? `, ${fp.preset} preset` : ''})` : 'Not in the 90-day plan' };
  });

  // ---------------- stops
  const nm = a.name;
  const topC = comps.map(c => ({ c, v: s.overall[c] ?? 0 })).sort((x, y) => y.v - x.v)[0];
  const client = brands.find(b => b.id === 'client')!;
  const ownedKw = keywords.filter(k => k.owner === 'client').length, planKw = keywords.filter(k => k.planOwner === 'client').length;
  const openVid = keywords.filter(k => k.video && !k.videoOwner).length;
  const mapLeader = comps.map(c => ({ c, v: countIn(grid, c) })).sort((x, y) => y.v - x.v)[0];
  const reviewMed = median(comps.map(c => d.brands[c]?.place?.reviews).filter((x): x is number => x != null));
  const linkLeader = comps.map(c => ({ c, v: d.brands[c]?.backlinks?.referringDomains ?? -1 })).sort((x, y) => y.v - x.v)[0];
  const aiLeaders = comps.filter(c => (m.aiNamed[c] || 0) > 0).sort((x, y) => (m.aiNamed[y] || 0) - (m.aiNamed[x] || 0)).slice(0, 2).map(disp);
  const activeNow = platforms.filter(p => p.status === 'active').map(p => p.name), activePlan = platforms.filter(p => p.planStatus === 'active').map(p => p.name);
  const checkedPlat = platforms.filter(p => p.status !== 'unknown').length;
  const compAds = comps.reduce((x, c) => x + (m.paid[c] || 0), 0);
  const videoAgents = [...new Set(plan.items.filter(i => i.category === 'video' || i.preset).map(i => i.deliveredBy.name + (i.preset ? ` (${i.preset})` : '')))];
  const oProj = client.proposed?.overall;
  const oLow = weightedOverall(cats.map(c => proj[c.key]?.low ?? c.scores.client ?? null), cats.map(c => c.weight));
  const oHigh = weightedOverall(cats.map(c => proj[c.key]?.high ?? c.scores.client ?? null), cats.map(c => c.weight));
  const stops: ReportStop[] = [
    { key: 'overview', label: 'Overview', t: `${nm} scores ${client.overall ?? 'n/a'} of 100. ${topC ? `${disp(topC.c)} scores ${topC.v}.` : ''}`, b: `Gold is the business. ${V.glow} are places customers can find it; plain white is a gap. A score of 100 means at or above the local competitor median. Click anything for details and sources.`,
      tp: `The 90-day plan projects ${oProj ?? 'n/a'} of 100 (range ${oLow ?? 'n/a'}-${oHigh ?? 'n/a'}).`, bp: 'Projections are ranges from fixed rules, shown on click. Results are measured every month against this baseline.' },
    { key: 'graph', label: 'Audience', t: `${nm} shows recent activity on ${activeNow.length} of ${checkedPlat} platforms checked.`, b: 'Sphere size is audience size. A gold path means the business is active there; thin means weak; dashed means absent or not checked. Colored dots are competitors. Click a sphere for searches, content and the plan.',
      tp: `After the plan: active on ${activePlan.slice(0, 5).join(', ')}.`, bp: 'One video becomes a Short, a Reel, a TikTok, a Facebook post and a Google profile post.' },
    { key: 'kw', label: 'Searches', t: `Buyers search ${keywords.length} main ways near ${city}. ${nm} ranks first on ${ownedKw}.`, b: `Tower height is monthly searches. Google shows video results on ${keywords.filter(k => k.video).length}; ${openVid} have no local business video yet (gold rings).`,
      tp: `The plan targets ${planKw} of these searches first, starting with the open video results.`, bp: 'Gold caps are the searches the plan targets; a projection, not a guarantee.' },
    { key: 'map', label: 'Map', t: `Top 3 on the Google map in ${cur} of ${n * n} spots across ${a.market}.`, b: `Each tile is a map search from that spot for "${firstKw}". ${mapLeader && mapLeader.v > 0 ? `${disp(mapLeader.c)} holds the most spots.` : ''}`,
      tp: `Projected: top 3 in ${countIn(planGrid, 'client')} of ${n * n} spots.`, bp: 'Weekly Google profile posts, reviews and consistent listings spread outward from the business location.' },
    { key: 'store', label: V.storeLabel, t: `Video uploaded in ${client.months.filter(Boolean).length} of the last 12 months.`, b: `${V.store}: ${client.speed ?? 'not checked'}.`,
      tp: V.calendar, bp: `The agents turn each ${ind.contentWord}'s photos into posts for YouTube Shorts, Instagram, TikTok and the Google profile.` },
    { key: 'reviews', label: 'Reviews', t: `${fmtNum(client.reviews)} Google reviews. The competitor median is ${fmtNum(reviewMed)}.`, b: `${V.crowd} Rating: ${client.rating ?? 'not shown'}.`,
      tp: `Projected: ${fmtNum(client.proposed?.reviews ?? null)} reviews in 90 days.`, bp: 'A review request after every sale or job, plus short testimonial videos.' },
    { key: 'video', label: 'Video', t: `${m.uploads12.client ?? 0} YouTube uploads in the last 12 months.`, b: brands.filter(b => b.screen).length ? `Screens show each competitor's most-viewed video found in YouTube searches.` : 'No competitor video appeared in the YouTube searches checked.',
      tp: `Video for every ${ind.contentWord}, plus answers to buyer questions.`, bp: `Made by ${videoAgents.slice(0, 3).join(', ')}.` },
    { key: 'ai', label: 'AI answers', t: `AI assistants named ${nm} in ${m.aiNamed.client || 0} of ${m.aiTotal} answers.`, b: aiLeaders.length ? `They name ${aiLeaders.join(' and ')} most often.` : 'They rarely name any local business, which leaves the field open.',
      tp: aiProj != null ? `Projected: named in about ${aiProj} of ${m.aiTotal}.` : 'Projected: named more often as new content is published.', bp: 'Question videos, their transcripts on the website, and consistent listings give the assistants something to cite.' },
    { key: 'comp', label: 'Competition', t: client.domains != null ? `${fmtNum(client.domains)} sites link to ${nm}. ${linkLeader && linkLeader.v >= 0 ? `${disp(linkLeader.c)} has ${fmtNum(linkLeader.v)}.` : ''}` : 'Linking sites were not checked in this audit.', b: `${V.links}: competitors showed ads on ${compAds} tracked searches.`,
      tp: 'The plan adds local links and, if the client chooses, video ads.', bp: 'Ads run from the best-performing shorts, aimed at the searches the business can win.' },
    { key: 'plan', label: '90-day plan', t: `The 90-day plan: ${client.overall ?? 'n/a'} to ${oProj ?? 'n/a'} projected.`, b: '', tp: `The 90-day plan: ${client.overall ?? 'n/a'} to ${oProj ?? 'n/a'} projected.`, bp: '',
      list: plan.items.filter(i => i.phase !== 'compound').slice(0, 7).map(i => `${i.action} (${i.deliveredBy.name}${i.preset ? `, ${i.preset} preset` : ''})`) },
  ];

  return {
    version: 1, scene, sample: a.sample, generatedAt: new Date().toISOString(),
    client: { name: nm, industry: ind.label, market: a.market, logo: d.logoDataUrl || null, initials: initials(nm) },
    categories: cats.map(c => ({ key: c.key, label: c.label, weight: c.weight, checked: c.checked })),
    brands, keywords,
    ai: { questions: d.questions || [], headline: (d.questions || [])[0] || '', rows, clientNamed: m.aiNamed.client || 0, total: m.aiTotal, projectedNamed: aiProj },
    map: { n, keyword: firstKw, home, grid, planGrid, labels: [] },
    platforms, stops, details: {}, evidence,
    labels: { planOn: '90-day plan: on', planOff: 'Show the 90-day plan', scoreToday: 'Presence score today', scorePlan: 'Projected after 90 days' },
  };
}

function weightedOverall(scores: (number | null)[], weights: number[]) {
  let s = 0, w = 0;
  scores.forEach((v, i) => { if (v != null) { s += v * weights[i]; w += weights[i]; } });
  return w ? Math.round(s / w) : null;
}
