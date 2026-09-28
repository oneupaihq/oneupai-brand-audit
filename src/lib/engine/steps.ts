import { getAudit, identities, namedIn, patchAudit, type AuditRow, type Ident } from '../audits';
import { env } from '../env';
import { log, recordEvidence } from '../evidence';
import { INDUSTRIES, industryServices, fill } from '../industries';
import type { AiAnswer, BrandData, BrandId, Candidate, Collected, Keyword, MapPoint, Place, SerpSummary, YtSerp } from '../types';
import { cityOf, domainOf, normName, pool, sameSite, textNames } from '../util';
import * as D from '../collectors/dataforseo';
import * as G from '../collectors/google';
import { crawlSite, logoDataUrl } from '../collectors/site';
import { parseMapsTop3, parseOrganic, parseYoutube, trimMaps, trimOrganic, trimYoutube } from '../collectors/parse';
import { sampleCollect, sampleResolve } from '../collectors/sample';
import { reviewContent } from './content';
import { analyze } from './analyze';

// The audit runs as a chain of steps. Each step is one serverless invocation (well under Vercel's
// 10-minute limit), saves its results, and names the next step. A step that is waiting on
// DataForSEO's queue returns { yield: true } and is picked up again by the next invocation.

export type StepResult = { next: string | null; status?: AuditRow['status']; yield?: boolean };
type Step = (a: AuditRow) => Promise<StepResult>;

const FULL = (a: AuditRow) => a.tier === 'full';
const city = (a: AuditRow) => a.data.city || cityOf(a.market);

async function save(a: AuditRow, data: Collected, extra: Partial<Record<keyof AuditRow, unknown>> = {}) {
  a.data = data;
  await patchAudit(a.id, { data, ...extra });
}

// ---------------------------------------------------------------- resolve
const resolve: Step = async a => {
  const ind = INDUSTRIES[a.inputs.industry];
  if (a.sample) {
    const s = await sampleResolve(a);
    await save(a, { ...a.data, geo: s.geo, city: s.city, brands: { client: { id: 'client', name: a.name, website: a.website, domain: domainOf(a.website), place: s.clientPlace, site: s.site } } }, {
      competitors: { clientPlace: s.clientPlace, clientPlaceOptions: s.options, candidates: s.candidates },
    });
    await log(a.id, 'Sample mode: found the business and 5 sample competitors.');
    return afterResolve(a);
  }
  const c = cityOf(a.market);
  const g = await G.geocode(a.market);
  const geoEv = await recordEvidence(a.id, { source: 'Google Places', label: `Location of ${a.market}`, query: { textQuery: a.market }, raw: g.raw });
  const geo = { lat: g.lat, lng: g.lng, label: g.label, evidence: geoEv };
  await log(a.id, `Found ${a.market} on Google Maps.`);

  const site = await crawlSite(a.website, c, FULL(a) ? 8 : 4);
  const siteEv = await recordEvidence(a.id, { source: 'Website', label: `Pages read on ${domainOf(a.website)}`, url: site.summary.url, raw: site.raw });
  const logo = await logoDataUrl(site.summary.logoUrl);
  await log(a.id, site.summary.ok ? `Read ${site.summary.pages.length} pages of the website.` : 'Could not read the website; it will show as not checked.', site.summary.ok ? 'info' : 'warn');

  // The prospect's own Google profile
  const bias = { lat: g.lat, lng: g.lng, radius: 40000 };
  const own = await G.placesSearch(`${a.name} ${a.market}`, bias, 5);
  const ownEv = await recordEvidence(a.id, { source: 'Google Places', label: `Google profiles matching "${a.name}"`, query: { textQuery: `${a.name} ${a.market}` }, raw: own.raw });
  const clientDomain = domainOf(a.website);
  const scored = own.places.map(p => ({ p, s: (sameSite(domainOf(p.website), clientDomain) ? 3 : 0) + (textNames(p.name, a.name) || textNames(a.name, p.name) ? 2 : 0) }));
  scored.sort((x, y) => y.s - x.s);
  const clientPlace = scored[0]?.s >= 2 ? { ...scored[0].p, evidence: ownEv } : null;

  // Competitor candidates: the map and the top organic results for the main searches
  const services = industryServices(ind, a.inputs.services);
  const svc = services[0] || ind.role;
  const found = new Map<string, Candidate>();
  const isClient = (d?: string, name?: string, pid?: string) => (d && clientDomain && sameSite(d, clientDomain)) || (pid && clientPlace && pid === clientPlace.placeId) || (name && normName(name) === normName(a.name));
  const isDir = (d?: string) => !!d && ind.directories.some(x => sameSite(d, x));
  const add = (key: string, c: Omit<Candidate, 'key' | 'score' | 'evidence'>, pts: number, ev: string) => {
    const cur = found.get(key);
    if (cur) { cur.score += pts; if (!cur.evidence.includes(ev)) cur.evidence.push(ev); if (!cur.place && c.place) cur.place = c.place; if (!cur.domain && c.domain) { cur.domain = c.domain; cur.website = c.website; } return; }
    found.set(key, { key, ...c, score: pts, evidence: [ev] });
  };
  for (const mk of ind.mapKeywords.map(m => fill(m, c, svc))) {
    const res = await G.placesSearch(mk.replace(/ near me$/, ` in ${c}`), bias, 10);
    const ev = await recordEvidence(a.id, { source: 'Google Places', label: `Map results for "${mk}"`, query: { textQuery: mk }, raw: res.raw });
    res.places.forEach((p, i) => {
      const d = domainOf(p.website);
      if (isClient(d, p.name, p.placeId) || isDir(d)) return;
      const key = d || p.placeId;
      add(key, { name: p.name, website: p.website, domain: d, place: p, why: `#${i + 1} on the map for "${mk}"` }, (10 - i) * 2 + Math.min(20, (p.reviews || 0) / 20), ev);
    });
  }
  for (const kw of services.slice(0, 2).map(s => `${s} ${c}`)) {
    try {
      const r = await D.liveSerp('google/organic', { keyword: kw, location_coordinate: `${g.lat.toFixed(6)},${g.lng.toFixed(6)},20000`, language_code: 'en', depth: 20 });
      const ev = await recordEvidence(a.id, { source: 'DataForSEO Google organic', label: `Google results for "${kw}"`, query: { keyword: kw }, url: r?.check_url, raw: trimOrganic(r) });
      const s = parseOrganic(kw, r, ev);
      s.organic.slice(0, 10).forEach(o => {
        if (isClient(o.domain) || isDir(o.domain)) return;
        const name = o.title.split(/[|\-–—:]/).pop()?.trim() || o.domain;
        add(o.domain, { name: found.get(o.domain)?.name || name, website: `https://${o.domain}`, domain: o.domain, why: `#${o.rank} on Google for "${kw}"` }, 12 - o.rank, ev);
      });
    } catch (e: any) { await log(a.id, `Organic check for competitors failed: ${e.message}`, 'warn'); }
  }
  const candidates = [...found.values()].sort((x, y) => y.score - x.score).slice(0, 8);
  await save(a, { ...a.data, geo, city: c, logoDataUrl: logo, brands: { client: { id: 'client', name: a.name, website: a.website, domain: clientDomain, place: clientPlace, site: { ...site.summary, evidence: siteEv } } } }, {
    competitors: { clientPlace, clientPlaceOptions: own.places.slice(0, 5), candidates },
  });
  await log(a.id, `Suggested ${Math.min(3, candidates.length)} competitors from ${candidates.length} found.`);
  return afterResolve(a);
};

async function afterResolve(a: AuditRow): Promise<StepResult> {
  const fresh = (await getAudit(a.id))!;
  // Monthly re-runs keep the competitors confirmed on the original audit, so months compare fairly.
  const parent = fresh.parent_id ? await getAudit(fresh.parent_id) : null;
  if (parent?.competitors?.confirmed) {
    await patchAudit(a.id, { competitors: { ...fresh.competitors!, confirmed: { client: fresh.competitors?.clientPlace ?? parent.competitors.confirmed.client, comps: parent.competitors.confirmed.comps } }, manual: parent.manual });
    await applyConfirmed((await getAudit(a.id))!);
    return { next: 'keywords' };
  }
  if (FULL(fresh)) return { next: 'keywords', status: 'awaiting_competitors' };
  // Quick audits take the suggested competitors as they are.
  const comp = fresh.competitors!;
  await patchAudit(a.id, { competitors: { ...comp, confirmed: { client: comp.clientPlace, comps: comp.candidates.slice(0, 3) } } });
  await applyConfirmed((await getAudit(a.id))!);
  return { next: 'keywords' };
}

/** Called when Nick confirms competitors (or automatically for quick audits). */
export async function applyConfirmed(a: AuditRow) {
  const conf = a.competitors?.confirmed;
  if (!conf) return;
  const brands: Collected['brands'] = { client: { ...(a.data.brands.client as BrandData), place: conf.client } };
  conf.comps.slice(0, 3).forEach((c, i) => {
    const id = (['a', 'b', 'c'] as BrandId[])[i];
    brands[id] = { id, name: c.name, website: c.website, domain: c.domain, place: c.place ?? null };
  });
  await patchAudit(a.id, { data: { ...a.data, brands } });
}

// ---------------------------------------------------------------- keywords
const keywords: Step = async a => {
  if (a.sample) {
    const data = await sampleCollect(a, a.data);
    await save(a, data);
    await log(a.id, 'Sample mode: generated sample searches, map, video and AI assistant results.');
    return { next: 'profiles' };
  }
  const ind = INDUSTRIES[a.inputs.industry];
  const c = city(a), lc = c.toLowerCase();
  const services = industryServices(ind, a.inputs.services);
  const es = a.inputs.languages.includes('es');
  const cand: Keyword[] = [];
  const push = (term: string, kind: Keyword['kind'], lang = 'en') => { term = term.toLowerCase().replace(/\s+/g, ' ').trim(); if (!cand.some(k => k.term === term)) cand.push({ term, volume: null, lang, kind }); };
  services.forEach(s => { push(`${s} ${lc}`, 'service'); push(`${s} near me`, 'near_me'); });
  ind.roles.forEach(r => { push(`best ${r} ${lc}`, 'best'); push(`${r} ${lc}`, 'service'); });
  if (es) ind.spanish.forEach(s => push(`${s} ${lc}`, 'spanish', 'es'));
  if (FULL(a)) {
    for (const seed of services.slice(0, 2)) {
      try {
        const sug = await D.keywordSuggestions(`${seed} ${lc}`, 'en', 30);
        sug.filter((s: { keyword: string }) => s.keyword.includes(lc) || s.keyword.includes('near me')).slice(0, 10).forEach((s: { keyword: string }) => push(s.keyword, s.keyword.includes('?') || /^(how|what|who|which|cost)/.test(s.keyword) ? 'question' : 'service'));
      } catch (e: any) { await log(a.id, `Keyword ideas for "${seed}" failed: ${e.message}`, 'warn'); }
    }
  }
  const coord = `${a.data.geo!.lat.toFixed(6)},${a.data.geo!.lng.toFixed(6)}`;
  for (const lang of ['en', ...(es ? ['es'] : [])]) {
    const list = cand.filter(k => k.lang === lang);
    if (!list.length) continue;
    const vols = await D.searchVolume(list.map(k => k.term), coord, lang);
    const ev = await recordEvidence(a.id, { source: 'DataForSEO Google Ads search volume', label: `Monthly searches near ${c} (${lang === 'es' ? 'Spanish' : 'English'})`, query: { keywords: list.map(k => k.term), location_coordinate: coord, language_code: lang }, raw: vols });
    for (const v of vols) { const k = cand.find(x => x.term === v.keyword.toLowerCase()); if (k) { k.volume = v.search_volume ?? 0; k.cpc = v.cpc; k.evidence = ev; } }
  }
  const max = FULL(a) ? 12 : 8;
  const ranked = cand.filter(k => (k.volume ?? 0) > 0).sort((x, y) => (y.volume ?? 0) - (x.volume ?? 0));
  const picked: Keyword[] = [];
  for (const k of ranked) { if (picked.length >= max) break; if (!picked.some(p => p.term.replace(/s\b/g, '') === k.term.replace(/s\b/g, ''))) picked.push(k); }
  const spanish = ranked.find(k => k.lang === 'es');
  if (spanish && !picked.includes(spanish)) picked[picked.length - 1] = spanish;
  if (!picked.length) picked.push(...cand.slice(0, max)); // no volume data at all: keep the templates, marked as unmeasured
  const svc = services[0] || ind.role;
  const questions = [...ind.questions.map(x => fill(x, c, svc)), ...(es ? [fill(ind.spanishQuestion, c, svc)] : [])].slice(0, FULL(a) ? 6 : 3);
  const mapKeywords = ind.mapKeywords.slice(0, FULL(a) ? 2 : 1).map(m => fill(m, c, svc).toLowerCase());
  await save(a, { ...a.data, keywords: picked, questions, maps: { keywords: mapKeywords, n: FULL(a) ? 5 : 3, spacingKm: ['real_estate', 'yacht_broker'].includes(a.inputs.industry) ? 4 : 3, points: [] } });
  await log(a.id, `Chose ${picked.length} searches to track, ${questions.length} buyer questions for the AI assistants.`);
  return { next: 'serp_post' };
};

// ---------------------------------------------------------------- SERP, maps and YouTube (queued)
interface Pending { kind: D.SerpKind; ref: string; id: string | null; task: Record<string, unknown>; done?: boolean }

function gridPoints(lat: number, lng: number, n: number, km: number) {
  const pts: { i: number; j: number; lat: number; lng: number }[] = [];
  const dLat = km / 111, dLng = km / (111 * Math.cos((lat * Math.PI) / 180));
  const h = (n - 1) / 2;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) pts.push({ i, j, lat: lat + (h - j) * dLat, lng: lng + (i - h) * dLng });
  return pts;
}

const serpPost: Step = async a => {
  const { geo, keywords: kws = [], maps } = a.data;
  const coord = `${geo!.lat.toFixed(6)},${geo!.lng.toFixed(6)},20000`;
  const tasks: Pending[] = [];
  for (const k of kws) tasks.push({ kind: 'google/organic', ref: `org:${k.term}`, id: null, task: { keyword: k.term, location_coordinate: coord, language_code: k.lang, depth: 20 } });
  tasks.push({ kind: 'google/organic', ref: `brand:${a.name}`, id: null, task: { keyword: `${a.name} ${city(a)}`, location_coordinate: coord, language_code: 'en', depth: 20 } });
  for (const k of kws.slice(0, FULL(a) ? 6 : 3)) tasks.push({ kind: 'youtube/organic', ref: `yt:${k.term}`, id: null, task: { keyword: k.term.replace(/ near me$/, ''), location_code: 2840, language_code: k.lang } });
  const pts = gridPoints(geo!.lat, geo!.lng, maps!.n, maps!.spacingKm);
  const zoom = maps!.spacingKm >= 4 ? 12 : 13;
  for (const p of pts) for (const mk of maps!.keywords) tasks.push({ kind: 'google/maps', ref: `map:${p.i}:${p.j}:${mk}`, id: null, task: { keyword: mk, location_coordinate: `${p.lat.toFixed(6)},${p.lng.toFixed(6)},${zoom}z`, language_code: 'en', depth: 20 } });

  if (env.dfsMode === 'live') {
    await pool(tasks, 10, async t => { try { const r = await D.liveSerp(t.kind, t.task); await absorb(a, t, r); } catch (e: any) { await log(a.id, `${t.ref} failed: ${e.message}`, 'warn'); } t.done = true; });
    await patchAudit(a.id, { waiting: null, data: a.data });
    return { next: 'assistants' };
  }
  for (const kind of ['google/organic', 'youtube/organic', 'google/maps'] as D.SerpKind[]) {
    const group = tasks.filter(t => t.kind === kind);
    const ids = await D.postTasks(kind, group.map(t => t.task));
    group.forEach((t, i) => { t.id = ids[i]; });
  }
  await patchAudit(a.id, { waiting: { postedAt: Date.now(), tasks: tasks.map(({ kind, ref, id, task }) => ({ kind, ref, id, task })) } });
  await log(a.id, `Queued ${tasks.length} Google, map and YouTube checks.`);
  return { next: 'serp_collect' };
};

/** Parse one SERP result into the audit's data and record its evidence. */
async function absorb(a: AuditRow, t: Pending, r: any) {
  const data = a.data;
  if (t.ref.startsWith('org:') || t.ref.startsWith('brand:')) {
    const kw = String(t.task.keyword);
    const ev = await recordEvidence(a.id, { source: 'DataForSEO Google organic', label: `Google results for "${kw}"`, query: t.task, url: r?.check_url, raw: trimOrganic(r) });
    const s = parseOrganic(kw, r, ev);
    if (t.ref.startsWith('brand:')) data.brandSerp = s; else data.serp = [...(data.serp || []).filter(x => x.keyword !== kw), s];
  } else if (t.ref.startsWith('yt:')) {
    const kw = String(t.task.keyword);
    const ev = await recordEvidence(a.id, { source: 'DataForSEO YouTube', label: `YouTube results for "${kw}"`, query: t.task, url: r?.check_url, raw: trimYoutube(r) });
    data.ytSerp = [...(data.ytSerp || []).filter(x => x.keyword !== kw), parseYoutube(kw, r, ev)];
  } else if (t.ref.startsWith('map:')) {
    const [, i, j, ...rest] = t.ref.split(':');
    const mk = rest.join(':');
    const ev = await recordEvidence(a.id, { source: 'DataForSEO Google Maps', label: `Map results for "${mk}" at grid point ${+i + 1}-${+j + 1}`, query: t.task, url: r?.check_url, raw: trimMaps(r) });
    const [lat, lng] = String(t.task.location_coordinate).split(',').map(Number);
    const pts = data.maps!.points;
    let p = pts.find(x => x.i === +i && x.j === +j);
    if (!p) { p = { i: +i, j: +j, lat, lng, top3: {}, evidence: ev }; pts.push(p); }
    p.top3[mk] = parseMapsTop3(r);
  }
}

const serpCollect: Step = async a => {
  const w = a.waiting as { postedAt: number; tasks: Pending[] } | null;
  if (!w) return { next: 'assistants' };
  const budget = 7 * 60_000;
  const start = Date.now();
  for (const kind of ['google/organic', 'youtube/organic', 'google/maps'] as D.SerpKind[]) {
    const group = w.tasks.filter(t => t.kind === kind && !t.done && t.id);
    if (!group.length) continue;
    const left = budget - (Date.now() - start);
    if (left < 20_000) break;
    const got = await D.collectTasks(kind, group.map(t => t.id!), left);
    for (const t of group) {
      if (!(t.id! in got)) continue;
      const r = got[t.id!];
      if (r?.error) await log(a.id, `${t.ref}: ${r.error}`, 'warn'); else await absorb(a, t, r);
      t.done = true;
    }
    await patchAudit(a.id, { waiting: w, data: a.data });
  }
  let open = w.tasks.filter(t => !t.done);
  // Anything the queue has not returned after 40 minutes (or that failed to post) is fetched live.
  if (open.length && (Date.now() - w.postedAt > 40 * 60_000 || open.every(t => !t.id))) {
    await pool(open, 8, async t => { try { await absorb(a, t, await D.liveSerp(t.kind, t.task)); } catch (e: any) { await log(a.id, `${t.ref} failed: ${e.message}`, 'warn'); } t.done = true; });
    open = [];
  }
  await patchAudit(a.id, { waiting: open.length ? w : null, data: a.data });
  if (open.length) { await log(a.id, `${w.tasks.length - open.length} of ${w.tasks.length} search checks back; waiting for the rest.`); return { next: 'serp_collect', yield: true }; }
  await log(a.id, `All ${w.tasks.length} search, map and YouTube checks are back.`);
  return { next: 'assistants' };
};

// ---------------------------------------------------------------- AI assistants
const assistants: Step = async a => {
  const ids = identities(a);
  const qs = a.data.questions || [];
  const runs = FULL(a) ? 2 : 1;
  const jobs: { as: 'chatgpt' | 'claude' | 'gemini'; qn: string; run: number }[] = [];
  for (const as of ['chatgpt', 'claude', 'gemini'] as const) for (const qn of qs) for (let run = 1; run <= runs; run++) jobs.push({ as, qn, run });
  const answers: AiAnswer[] = [];
  const failed: string[] = [];
  await pool(jobs, 6, async j => {
    try {
      const r = await D.askAssistant(j.as, j.qn, city(a));
      const ev = await recordEvidence(a.id, { source: `DataForSEO ${j.as === 'chatgpt' ? 'ChatGPT' : j.as === 'claude' ? 'Claude' : 'Gemini'} response`, label: `${j.as === 'chatgpt' ? 'ChatGPT' : j.as === 'claude' ? 'Claude' : 'Gemini'} answer ${j.run} to "${j.qn}"`, query: { question: j.qn, model: r.model, web_search: true }, raw: { text: r.text, citations: r.citations, model: r.model } });
      answers.push({ assistant: j.as, model: r.model, question: j.qn, run: j.run, text: r.text, citations: r.citations, mentions: namedIn(ids, r.text, r.citations), evidence: ev });
    } catch (e: any) { failed.push(`${j.as}: ${e.message}`); }
  });
  await save(a, { ...a.data, ai: answers });
  await log(a.id, `Asked ChatGPT, Claude and Gemini ${qs.length} questions, ${runs} time(s) each: ${answers.length} answers saved.`);
  if (failed.length) await log(a.id, `${failed.length} assistant questions failed (first: ${failed[0]}).`, 'warn');
  return { next: 'profiles' };
};

// ---------------------------------------------------------------- profiles: Google profile, speed, links, YouTube
const profiles: Step = async a => {
  if (a.sample) return { next: 'content' };
  const data = a.data;
  const ids = identities(a);
  await pool(ids, 4, async idn => {
    const b = (data.brands[idn.id] ||= { id: idn.id, name: idn.name }) as BrandData;
    try {
      if (b.place?.placeId) {
        const d = await G.placeDetails(b.place.placeId);
        const ev = await recordEvidence(a.id, { source: 'Google Places', label: `Google profile of ${b.name}`, query: { placeId: b.place.placeId }, url: d.place.mapsUrl, raw: d.raw });
        b.place = { ...d.place, evidence: ev };
      }
    } catch (e: any) { await log(a.id, `Google profile for ${b.name}: ${e.message}`, 'warn'); }
    const site = b.website || (b.place?.website);
    if (site) {
      b.website ||= site; b.domain ||= domainOf(site);
      try {
        const ps = await G.pageSpeed(site);
        const ev = await recordEvidence(a.id, { source: 'Google PageSpeed', label: `Mobile speed of ${domainOf(site)}`, query: { url: site, strategy: 'mobile' }, raw: ps.raw });
        b.speed = { performance: ps.performance, seo: ps.seo, evidence: ev };
      } catch (e: any) { await log(a.id, `Speed test for ${b.name}: ${e.message}`, 'warn'); }
      if (idn.id !== 'client') {
        try {
          const s = await crawlSite(site, city(a), 4);
          const ev = await recordEvidence(a.id, { source: 'Website', label: `Pages read on ${domainOf(site)}`, url: s.summary.url, raw: s.raw });
          b.site = { ...s.summary, text: s.summary.text.slice(0, 3000), evidence: ev };
        } catch { /* optional */ }
      }
      if (FULL(a) && b.domain) {
        try {
          const bl = await D.backlinksSummary(b.domain);
          const ev = await recordEvidence(a.id, { source: 'DataForSEO Backlinks', label: `Sites linking to ${b.domain}`, query: { target: b.domain }, raw: bl.raw });
          b.backlinks = { referringDomains: bl.referringDomains, backlinks: bl.backlinks, evidence: ev };
        } catch (e: any) { await log(a.id, `Backlinks for ${b.name}: ${e.message}`, 'warn'); }
      }
    }
    try {
      const hint = (idn.id === 'client' ? a.inputs.social.youtube : undefined) || b.site?.socialLinks?.youtube;
      const chId = hint ? await G.findChannelId(hint) : null;
      if (chId) {
        const ch = await G.channelSummary(chId);
        const ev = await recordEvidence(a.id, { source: 'YouTube Data API', label: `YouTube channel of ${b.name}`, url: `https://www.youtube.com/channel/${chId}`, raw: ch.raw });
        b.youtube = { ...ch.summary, evidence: ev };
      } else b.youtube = null;
    } catch (e: any) { await log(a.id, `YouTube for ${b.name}: ${e.message}`, 'warn'); }
  });
  await save(a, data);
  await log(a.id, 'Checked Google profiles, website speed, linking sites and YouTube channels.');
  return { next: 'content' };
};

// ---------------------------------------------------------------- content review, then analysis
const content: Step = async a => {
  if (!FULL(a) || a.sample) return { next: 'analyze' };
  const review = await reviewContent(a);
  await save(a, { ...a.data, contentReview: review });
  if (review) await log(a.id, `Content review: ${review.checks.length} checks kept after the quote check.`);
  return { next: 'analyze' };
};

const analyzeStep: Step = async a => {
  await analyze(a);
  await log(a.id, 'Scores, findings, 90-day plan and strategy brief are ready for review.');
  return { next: null, status: 'review' };
};

export const STEPS: Record<string, Step> = { resolve, keywords, serp_post: serpPost, serp_collect: serpCollect, assistants, profiles, content, analyze: analyzeStep };

export const STEP_LABELS: Record<string, string> = {
  resolve: 'Finding the business and competitors', keywords: 'Choosing the searches to track', serp_post: 'Queuing Google, map and YouTube checks',
  serp_collect: 'Collecting Google, map and YouTube results', assistants: 'Asking ChatGPT, Claude and Gemini', profiles: 'Checking profiles, speed, links and YouTube',
  content: 'Reviewing the brand\'s content', analyze: 'Scoring and writing the plan',
};

export type { Ident, Place, SerpSummary, YtSerp, MapPoint };
