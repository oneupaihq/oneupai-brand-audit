import type { AuditRow } from '../audits';
import { recordEvidence } from '../evidence';
import { INDUSTRIES, industryServices, fill } from '../industries';
import type { AiAnswer, BrandData, BrandId, Candidate, Collected, Keyword, MapPoint, Place, SerpSummary, YtSerp } from '../types';
import { cityOf, domainOf, rng } from '../util';

// Sample data for running the tool before API keys are in. Every record is marked as sample,
// the review screen says so, and the 3D report shows a "Sample data" banner.

const SAMPLE = { source: 'Sample data', sample: true };

export async function sampleResolve(a: AuditRow) {
  const r = rng(a.name + a.market);
  const city = cityOf(a.market);
  const geo = { lat: 28.5383 + (r() - 0.5) * 0.02, lng: -81.3792 + (r() - 0.5) * 0.02, label: a.market };
  const ev = await recordEvidence(a.id, { ...SAMPLE, label: `Sample business profiles in ${city}` });
  const clientPlace: Place = { placeId: 'sample-client', name: a.name, address: `${city} (sample address)`, lat: geo.lat, lng: geo.lng, website: a.website, rating: 4.8, reviews: Math.round(8 + r() * 20), category: INDUSTRIES[a.inputs.industry].label, photos: 4, hasHours: true, evidence: ev };
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const candidates: Candidate[] = letters.map((L, i) => ({
    key: `sample-${L}`, name: `Sample Competitor ${L}`, domain: `competitor-${L.toLowerCase()}.example`, website: `https://competitor-${L.toLowerCase()}.example`,
    place: { placeId: `sample-${L}`, name: `Sample Competitor ${L}`, lat: geo.lat + (r() - 0.5) * 0.1, lng: geo.lng + (r() - 0.5) * 0.1, rating: +(4.3 + r() * 0.6).toFixed(1), reviews: Math.round(340 / (i + 1) + r() * 40), website: `https://competitor-${L.toLowerCase()}.example`, category: INDUSTRIES[a.inputs.industry].label },
    why: i < 3 ? `Top 3 on the map for "${fill(INDUSTRIES[a.inputs.industry].mapKeywords[0], city, industryServices(INDUSTRIES[a.inputs.industry], a.inputs.services)[0] || 'service')}" (sample)` : 'Ranks on page 1 of Google (sample)',
    score: 100 - i * 15, evidence: [ev],
  }));
  const site = {
    url: a.website, ok: true, pages: [{ url: a.website, title: `${a.name} | ${city}`, h1: a.name, words: 420 }], hasPhoneLink: r() > 0.5, hasSchemaLocalBusiness: false, schemaTypes: [],
    hasFaq: false, videoEmbeds: 0, mentionsCity: true, spanish: false, socialLinks: {}, text: `${a.name} serves ${city}. (Sample website text.)`, evidence: ev,
  };
  return { geo, city, clientPlace, options: [clientPlace], candidates, site };
}

export async function sampleCollect(a: AuditRow, data: Collected): Promise<Collected> {
  const ind = INDUSTRIES[a.inputs.industry];
  const city = cityOf(a.market);
  const r = rng(a.id);
  const services = industryServices(ind, a.inputs.services);
  const svc = services[0] || 'service';
  const ev = await recordEvidence(a.id, { ...SAMPLE, label: 'Sample search, map, video and AI assistant results' });
  // Profiles: client weak, A strong, B medium, C mixed.
  const shape: Record<BrandId, number> = { client: 0.25, a: 0.95, b: 0.7, c: 0.55 };
  const brands = { ...data.brands } as Record<BrandId, BrandData>;
  for (const id of ['client', 'a', 'b', 'c'] as BrandId[]) {
    const s = shape[id];
    const b = brands[id] || ({ id, name: id } as BrandData);
    b.place ??= { placeId: `sample-${id}`, name: b.name, rating: 4.6, reviews: 20 };
    if (b.place) { b.place.reviews = id === 'client' ? b.place.reviews : Math.round(60 + s * 300 + r() * 40); b.place.photos = Math.round(s * 40); b.place.hasHours = s > 0.3; b.place.description = s > 0.5 ? 'Sample description' : undefined; }
    b.speed = { performance: Math.round(45 + r() * 40), seo: Math.round(70 + r() * 25), evidence: ev };
    b.backlinks = { referringDomains: Math.round(4 + s * 170 * (0.8 + r() * 0.4)), backlinks: Math.round(20 + s * 2000), evidence: ev };
    const months = Array.from({ length: 12 }, () => (r() < s * 0.9 ? Math.round(1 + r() * 4 * s) : 0));
    b.youtube = s > 0.3 ? { channelId: `sample-${id}`, title: b.name, subscribers: Math.round(s * 4000), videos: Math.round(s * 120), uploads12: months, views12: Math.round(s * s * 200000), recentTitles: ['Sample video'], recentIds: [`vid-${id}`], evidence: ev } : null;
    b.site ??= { url: b.website || '', ok: true, pages: [], hasPhoneLink: s > 0.5, hasSchemaLocalBusiness: s > 0.6, schemaTypes: [], hasFaq: s > 0.7, videoEmbeds: s > 0.6 ? 3 : 0, mentionsCity: true, spanish: id === 'c', socialLinks: {}, text: '', evidence: ev };
    brands[id] = b;
  }
  const kwTerms: Keyword[] = [];
  const base = [2900, 1600, 1300, 880, 720, 590, 590, 480, 390, 320, 260, 110];
  const templ = [...services.slice(0, 5).map(s => `${s} ${city.toLowerCase()}`), ...services.slice(0, 3).map(s => `${s} near me`), `best ${ind.role} ${city.toLowerCase()}`, `${ind.role} ${city.toLowerCase()}`, ...(a.inputs.languages.includes('es') && ind.spanish[0] ? [`${ind.spanish[0]} ${city.toLowerCase()}`] : [])];
  [...new Set(templ)].slice(0, 12).forEach((t, i) => kwTerms.push({ term: t, volume: base[i] ?? 100, lang: /[áéíóúñ]|^(casas|yates|remodelaci|jardin|paisaj|agente|corredor|contratista)/.test(t) ? 'es' : 'en', kind: t.includes('near me') ? 'near_me' : t.startsWith('best') ? 'best' : 'service', evidence: ev }));
  const owners: (BrandId | null)[] = ['a', 'b', 'a', 'a', null, 'b', 'c', 'client', 'a', 'c', null, null];
  const serp: SerpSummary[] = kwTerms.map((k, i) => {
    const own = owners[i % owners.length];
    const dom = (id: BrandId | null) => (id ? brands[id].domain || domainOf(brands[id].website) || `${id}.example` : 'directory.example');
    const org = [own, ...(['a', 'b', 'c', 'client'] as BrandId[]).filter(x => x !== own)].map((id, n) => ({ rank: n + 1 + (id === 'client' && own !== 'client' ? 6 : 0), domain: dom(id), url: `https://${dom(id)}/`, title: id ? brands[id].name : 'Directory' }));
    const video = i % 3 !== 2;
    return { keyword: k.term, organic: org, paidDomains: i % 2 === 0 ? [dom('a')] : [dom('b')], local: own ? [{ rank: 1, title: brands[own].name, domain: dom(own) }] : [], videoRow: video,
      videoItems: video && i % 4 === 0 ? [{ title: `${brands.a.name} sample video`, url: 'https://www.youtube.com/watch?v=vid-a', domain: 'youtube.com' }] : [], aiOverview: { present: i < 4, refDomains: i < 4 ? [dom('a')] : [] }, evidence: ev };
  });
  const n = a.tier === 'quick' ? 3 : 5;
  const mk = ind.mapKeywords.slice(0, a.tier === 'quick' ? 1 : 2).map(m => fill(m, city, svc).toLowerCase());
  const points: MapPoint[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const top3: MapPoint['top3'] = {};
    for (const k of mk) {
      const near = Math.hypot(i - 1, j - (n - 2)) < 1.3;
      const ids: BrandId[] = near ? ['client', 'a', 'b'] : j < n / 2 ? ['a', 'b', 'c'] : i > n / 2 ? ['b', 'c', 'a'] : ['c', 'a', 'b'];
      top3[k] = ids.map(id => ({ title: brands[id].name, domain: brands[id].domain, placeId: brands[id].place?.placeId }));
    }
    points.push({ i, j, lat: (data.geo?.lat ?? 28.5) + (j - 2) * 0.03, lng: (data.geo?.lng ?? -81.4) + (i - 2) * 0.03, top3, evidence: ev });
  }
  const ytSerp: YtSerp[] = kwTerms.slice(0, 6).map(k => ({ keyword: k.term, videos: [{ rank: 1, title: `${k.term} (sample)`, channel: brands.a.name, views: 184000, url: 'https://www.youtube.com/watch?v=vid-a', isShorts: true }], evidence: ev }));
  const questions = [...ind.questions.map(x => fill(x, city, svc)), ...(a.inputs.languages.includes('es') ? [fill(ind.spanishQuestion, city, svc)] : [])].slice(0, a.tier === 'quick' ? 3 : 6);
  const ai: AiAnswer[] = [];
  for (const as of ['chatgpt', 'claude', 'gemini'] as const) for (const qn of questions) for (let run = 1; run <= (a.tier === 'quick' ? 1 : 2); run++) {
    const named: BrandId[] = r() < 0.8 ? ['a'] : [];
    if (r() < 0.5) named.push('b');
    if (r() < 0.2) named.push('c');
    ai.push({ assistant: as, model: 'sample', question: qn, run, text: `Sample answer naming ${named.map(id => brands[id].name).join(' and ') || 'no local business'}.`, citations: [], mentions: named, evidence: ev });
  }
  return { ...data, brands, keywords: kwTerms, questions, serp, brandSerp: null, maps: { keywords: mk, n, spacingKm: 3, points }, ytSerp, ai, contentReview: null };
}
