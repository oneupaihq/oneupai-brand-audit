/* End-to-end engine test, no network needed.
 *   npm test            -> fact-check unit tests, then three audits through every step with
 *                          mocked DataForSEO / Google / website responses (the real code paths),
 *                          then one audit in sample mode.
 * Uses an in-memory Postgres (PGlite). Writes report JSON to .test-out/ for the renderer check.
 */
import fs from 'fs';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'pglite:';
process.env.DATAFORSEO_LOGIN = 'test';
process.env.DATAFORSEO_PASSWORD = 'test';
process.env.GOOGLE_API_KEY = 'test';
process.env.ANTHROPIC_API_KEY = '';

let failures = 0;
const ok = (cond: unknown, msg: string) => { if (cond) console.log('  ok  ', msg); else { failures++; console.log('  FAIL', msg); } };

// ---------------------------------------------------------------- mocked outside world
type Biz = { name: string; domain: string; reviews: number; rating: number; placeId: string };
const WORLD: Record<string, { city: string; lat: number; lng: number; client: Biz; comps: Biz[] }> = {
  'San Diego, CA': { city: 'San Diego', lat: 32.7157, lng: -117.1611, client: { name: 'California Realty', domain: 'californiarealty.test', reviews: 11, rating: 4.9, placeId: 'p-cr' },
    comps: [{ name: 'Harbor Homes Group', domain: 'harborhomes.test', reviews: 420, rating: 4.8, placeId: 'p-hh' }, { name: 'Pacific Key Realty', domain: 'pacifickey.test', reviews: 180, rating: 4.7, placeId: 'p-pk' }, { name: 'Mesa Property Partners', domain: 'mesapp.test', reviews: 95, rating: 4.6, placeId: 'p-mp' }] },
  'Fort Lauderdale, FL': { city: 'Fort Lauderdale', lat: 26.1224, lng: -80.1373, client: { name: 'Florida Yachts', domain: 'floridayachts.test', reviews: 6, rating: 5, placeId: 'p-fy' },
    comps: [{ name: 'Bluewater Brokerage', domain: 'bluewaterbrokerage.test', reviews: 150, rating: 4.9, placeId: 'p-bw' }, { name: 'Intracoastal Marine Sales', domain: 'icmarinesales.test', reviews: 60, rating: 4.7, placeId: 'p-ic' }, { name: 'Seaside Yacht Group', domain: 'seasideyg.test', reviews: 33, rating: 4.4, placeId: 'p-ss' }] },
  'Orlando, FL': { city: 'Orlando', lat: 28.5383, lng: -81.3792, client: { name: 'Remodeled-for-You', domain: 'remodeledforyou.test', reviews: 19, rating: 4.7, placeId: 'p-ry' },
    comps: [{ name: 'Sunshine Kitchen & Bath', domain: 'sunshinekb.test', reviews: 510, rating: 4.9, placeId: 'p-sk' }, { name: 'Lakeside Builders', domain: 'lakesidebuilders.test', reviews: 240, rating: 4.8, placeId: 'p-lb' }, { name: 'Orange County Renovations', domain: 'ocreno.test', reviews: 88, rating: 4.3, placeId: 'p-oc' }] },
};
const all = () => Object.values(WORLD).flatMap(w => [w.client, ...w.comps].map(b => ({ ...b, w })));
const worldOf = (text: string) => Object.values(WORLD).find(w => text.toLowerCase().includes(w.city.toLowerCase())) || Object.values(WORLD).find(w => all().some(b => b.w === w && text.toLowerCase().includes(b.name.toLowerCase()))) || WORLD['Orlando, FL'];
const place = (b: Biz, w: { lat: number; lng: number }) => ({ id: b.placeId, displayName: { text: b.name }, formattedAddress: `1 Main St`, location: { latitude: w.lat + 0.01, longitude: w.lng - 0.01 }, rating: b.rating, userRatingCount: b.reviews, websiteUri: `https://www.${b.domain}/`, nationalPhoneNumber: '(555) 555-0100', googleMapsUri: `https://maps.google.com/?cid=${b.placeId}`, primaryTypeDisplayName: { text: 'Business' }, photos: new Array(b.reviews > 100 ? 12 : 3).fill({}), regularOpeningHours: b.reviews > 50 ? {} : undefined, editorialSummary: b.reviews > 200 ? { text: 'Trusted local team.' } : undefined });
const queued = new Map<string, { kind: string; task: any; polls: number }>();
let taskN = 0;
const J = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const dfsOk = (result: unknown, cost = 0.002) => J({ status_code: 20000, cost, tasks: [{ status_code: 20000, status_message: 'Ok.', result: Array.isArray(result) ? result : [result] }] });

function organic(kw: string, check = true) {
  const w = worldOf(kw); const [A, B, C] = w.comps;
  const isBrand = kw.toLowerCase().includes(w.client.name.toLowerCase());
  const order = isBrand ? [w.client, A] : kw.includes('best') ? [A, B, w.client, C] : [B, A, C];
  const items: any[] = [
    { type: 'organic', rank_group: 1, domain: 'www.yelp.com', url: 'https://www.yelp.com/x', title: 'Top 10 Best - Yelp' },
    ...order.map((b, i) => ({ type: 'organic', rank_group: i + 2, domain: `www.${b.domain}`, url: `https://www.${b.domain}/`, title: `${b.name} | ${w.city}` })),
    { type: 'local_pack', rank_group: 1, title: A.name, domain: A.domain },
    { type: 'paid', rank_group: 1, domain: A.domain, url: `https://${A.domain}/ad` },
  ];
  if (kw.length % 2 === 0) items.push({ type: 'video', rank_group: 1, items: [{ title: `${A.name} tour`, url: 'https://www.youtube.com/watch?v=vidA1', source: 'YouTube' }] });
  else items.push({ type: 'video', rank_group: 1, items: [] });
  if (kw.startsWith('best')) items.push({ type: 'ai_overview', rank_group: 1, items: [{ text: `Options include ${A.name}.`, references: [{ domain: A.domain, url: `https://${A.domain}` }] }] });
  return { keyword: kw, check_url: check ? 'https://google.com/search?q=' + encodeURIComponent(kw) : undefined, items };
}

async function mockFetch(input: any, init?: any): Promise<Response> {
  const url = String(input instanceof Request ? input.url : input);
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  // Google Places
  if (url.includes('places:searchText')) {
    const t: string = body.textQuery;
    const w = worldOf(t);
    if (Object.keys(WORLD).some(m => m.toLowerCase() === t.toLowerCase())) return J({ places: [{ id: 'city', displayName: { text: w.city }, formattedAddress: t, location: { latitude: w.lat, longitude: w.lng } }] });
    if (t.toLowerCase().includes(w.client.name.toLowerCase())) return J({ places: [place(w.client, w), place(w.comps[2], w)] });
    return J({ places: [place(w.comps[0], w), place(w.comps[1], w), { ...place({ name: 'Yelp listing', domain: 'yelp.com', reviews: 3, rating: 4, placeId: 'p-yelp' }, w) }, place(w.comps[2], w)] });
  }
  if (url.includes('places.googleapis.com/v1/places/')) {
    const id = decodeURIComponent(url.split('/places/')[1].split('?')[0]);
    const b = all().find(x => x.placeId === id)!;
    return J(place(b, b.w));
  }
  if (url.includes('pagespeedonline')) { const d = new URL(url).searchParams.get('url')!; const client = Object.values(WORLD).some(w => d.includes(w.client.domain)); return J({ lighthouseResult: { finalUrl: d, categories: { performance: { score: client ? 0.41 : 0.78 }, seo: { score: 0.9 } }, audits: {} } }); }
  // YouTube Data API
  if (url.includes('youtube/v3/channels')) { const u = new URL(url); const id = u.searchParams.get('id') || 'UC-' + (u.searchParams.get('forHandle') || 'x'); return J({ items: [{ id, snippet: { title: id.includes('bluewater') || id.includes('sunshine') || id.includes('harbor') ? id.slice(4) : id }, statistics: { subscriberCount: '1200', videoCount: '40' }, contentDetails: { relatedPlaylists: { uploads: 'UU' + id } } }] }); }
  if (url.includes('youtube/v3/playlistItems')) { const now = Date.now(); return J({ items: Array.from({ length: 8 }, (_, i) => ({ snippet: { title: `Video ${i}`, publishedAt: new Date(now - i * 40 * 86400_000).toISOString() }, contentDetails: { videoId: i === 0 ? 'vidA1' : `v${i}`, videoPublishedAt: new Date(now - i * 40 * 86400_000).toISOString() } })) }); }
  if (url.includes('youtube/v3/videos')) return J({ items: [{ statistics: { viewCount: '5000' } }, { statistics: { viewCount: '1200' } }] });
  if (url.includes('youtube/v3/search')) return J({ items: [] });
  // DataForSEO
  if (url.includes('api.dataforseo.com')) {
    const path = url.split('/v3')[1];
    if (path.includes('/task_post')) {
      const kind = path.split('/serp/')[1].split('/task_post')[0];
      return J({ status_code: 20000, cost: 0.0006 * body.length, tasks: body.map((t: any) => { const id = `t${++taskN}`; queued.set(id, { kind, task: t, polls: 0 }); return { id, status_code: 20100, status_message: 'Task Created.' }; }) });
    }
    if (path.includes('/task_get/advanced/')) {
      const id = path.split('/advanced/')[1];
      const q = queued.get(id)!; q.polls++;
      if (q.polls < 2) return J({ status_code: 20000, tasks: [{ status_code: 40602, status_message: 'Task In Queue.' }] });
      if (q.kind === 'google/organic') return dfsOk(organic(q.task.keyword), 0);
      if (q.kind === 'youtube/organic') { const w = worldOf(q.task.keyword); return dfsOk({ keyword: q.task.keyword, items: [{ type: 'youtube_video', rank_group: 1, title: `${q.task.keyword} tour`, url: 'https://www.youtube.com/watch?v=vidA1', channel_name: w.comps[0].name, views_count: 184000, is_shorts: true }] }, 0); }
      if (q.kind === 'google/maps') {
        const w = worldOf(q.task.keyword.includes('near me') ? all()[0].w.city : q.task.keyword);
        const [lat, lng] = q.task.location_coordinate.split(',').map(Number);
        const near = Math.abs(lat - (w.lat + 0.01)) < 0.03 && Math.abs(lng - (w.lng - 0.01)) < 0.03;
        const order = near ? [w.client, w.comps[0], w.comps[1]] : lat > w.lat ? [w.comps[0], w.comps[1], w.comps[2]] : [w.comps[1], w.comps[2], w.comps[0]];
        return dfsOk({ keyword: q.task.keyword, items: order.map((b, i) => ({ type: 'maps_search', rank_group: i + 1, title: b.name, domain: b.domain, place_id: b.placeId })) }, 0);
      }
    }
    if (path.includes('/serp/google/organic/live/advanced')) return dfsOk(organic(body[0].keyword));
    if (path.includes('/serp/') && path.includes('/live/advanced')) return dfsOk({ items: [] });
    if (path.includes('search_volume/live')) return dfsOk(body[0].keywords.map((k: string, i: number) => ({ keyword: k, search_volume: k.includes('near me') ? 1900 : Math.max(10, 1400 - i * 90), cpc: 3.2, competition: 'HIGH' })), 0.075);
    if (path.includes('keyword_suggestions/live')) return dfsOk([{ items: [{ keyword: body[0].keyword + ' cost', keyword_info: { search_volume: 320 } }, { keyword: 'unrelated term', keyword_info: { search_volume: 999 } }] }], 0.013);
    if (path.includes('/backlinks/summary/live')) { const t: string = body[0].target; const b = all().find(x => t.includes(x.domain)); return dfsOk({ target: t, referring_domains: b ? b.reviews / 2 : 5, referring_main_domains: b ? Math.round(b.reviews / 3) : 4, backlinks: 900, rank: 120 }, 0.024); }
    if (path.includes('/llm_responses/models')) return J({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ model_name: 'old-model', web_search_supported: false }, { model_name: path.includes('chat_gpt') ? 'gpt-5' : path.includes('claude') ? 'claude-sonnet-x' : 'gemini-2.5-flash', web_search_supported: true }] }] });
    if (path.includes('/llm_responses/live')) {
      const qn: string = body[0].user_prompt; const w = worldOf(qn);
      const named = path.includes('claude') ? `${w.comps[1].name} and ${w.client.name}` : `${w.comps[0].name}, ${w.comps[1].name}`;
      return dfsOk([{ model_name: body[0].model_name, money_spent: 0.004, items: [{ type: 'message', sections: [{ type: 'text', text: `Good options include ${named}.`, annotations: [{ title: 'Guide', url: `https://${w.comps[0].domain}/about` }] }] }] }], 0.0006);
    }
    return J({ status_code: 40400, status_message: 'Not mocked: ' + path });
  }
  // Websites
  const b = all().find(x => url.includes(x.domain));
  if (b) {
    if (/\.png$/.test(url)) return new Response(new Uint8Array(1200), { headers: { 'content-type': 'image/png' } });
    const isClient = Object.values(WORLD).some(w => w.client.domain === b.domain);
    const html = `<!doctype html><html lang="en"><head><title>${b.name} | ${b.w.city}</title><link rel="apple-touch-icon" href="/logo.png">${isClient ? '' : '<script type="application/ld+json">{"@type":"LocalBusiness"}</script>'}</head><body><h1>${b.name}</h1><p>We help clients across ${b.w.city} with trusted service since 2009. Call today for a free consultation.</p>${isClient ? '' : '<a href="tel:5555550100">Call</a><iframe src="https://www.youtube.com/embed/x"></iframe>'}<a href="/services">Services</a><a href="/about">About</a><a href="https://instagram.com/${b.domain.split('.')[0]}">IG</a></body></html>`;
    return new Response(html, { headers: { 'content-type': 'text/html' } });
  }
  return new Response('not found', { status: 404 });
}

// ---------------------------------------------------------------- tests
async function main() {
  console.log('\nFact check');
  const { factSet, filterText, quoteFound, checkSentence } = await import('../src/lib/ai/validate');
  const facts = factSet([{ reviews: 19, median: 240 }, 'Named in 2 of 36 answers'], ['Remodeled-for-You', 'Sunshine Kitchen & Bath', 'Orlando']);
  ok(checkSentence('Remodeled-for-You has 19 reviews against a median of 240.', facts) === null, 'keeps a sentence whose numbers are in the data');
  ok(checkSentence('Reviews grew 45% last year.', facts) !== null, 'drops an invented percentage');
  ok(checkSentence('You trail Sunshine Kitchen & Bath on reviews.', facts) === null, 'keeps a known competitor name');
  ok(checkSentence('Customers prefer Acme Home Pros for kitchens.', facts) !== null, 'drops an unknown business name');
  ok(filterText('You have 19 reviews. Competitors average 812 reviews.', facts).dropped.length === 1, 'filters only the unsupported sentence');
  ok(quoteFound('trusted service  since 2009', 'We help with Trusted service since 2009. Call'), 'finds a quote despite spacing and case');
  ok(!quoteFound('award-winning service', 'We help with trusted service since 2009.'), 'rejects a quote that is not in the source');

  (globalThis as any).fetch = mockFetch;
  const { createAudit, getAudit, patchAudit } = await import('../src/lib/audits');
  const { runNext } = await import('../src/lib/jobs');
  const { applyConfirmed } = await import('../src/lib/engine/steps');
  const { analyze } = await import('../src/lib/engine/analyze');
  const { q } = await import('../src/lib/db');
  fs.mkdirSync('.test-out', { recursive: true });

  const prospects = [
    { name: 'California Realty', website: 'californiarealty.test', market: 'San Diego, CA', industry: 'real_estate', languages: ['en', 'es'] },
    { name: 'Florida Yachts', website: 'floridayachts.test', market: 'Fort Lauderdale, FL', industry: 'yacht_broker', languages: ['en', 'es'] },
    { name: 'Remodeled-for-You', website: 'remodeledforyou.test', market: 'Orlando, FL', industry: 'remodeler', languages: ['en'] },
  ] as const;

  for (const p of prospects) {
    console.log(`\nFull audit: ${p.name} (${p.market}), mocked live data`);
    const a = await createAudit({ name: p.name, website: p.website, market: p.market, industry: p.industry, tier: 'full', languages: [...p.languages], social: {} });
    ok(!a.sample, 'runs in live mode when keys are present');
    let guard = 0;
    const drive = async () => { while (guard++ < 40) { const again = await runNext(a.id); if (!again) break; } };
    await drive();
    let cur = (await getAudit(a.id))!;
    ok(cur.status === 'awaiting_competitors', `pauses for competitor confirmation (status ${cur.status})`);
    const cands = cur.competitors!.candidates;
    ok(cands.length >= 3, `suggests competitors (${cands.map(c => c.name).join(', ')})`);
    ok(!cands.some(c => c.domain?.includes('yelp')), 'leaves directories out of the suggestions');
    ok(cur.competitors!.clientPlace?.name === p.name, 'matches the prospect\'s own Google profile');
    // Nick confirms the suggestions
    await patchAudit(a.id, { competitors: { ...cur.competitors!, confirmed: { client: cur.competitors!.clientPlace, comps: cands.slice(0, 3) } }, status: 'running' });
    await applyConfirmed((await getAudit(a.id))!);
    await drive();
    cur = (await getAudit(a.id))!;
    ok(cur.status === 'review', `finishes every step (status ${cur.status}${cur.error ? ', error: ' + cur.error : ''})`);
    const r = cur.results!;
    ok(r.scores.categories.length === 10, '10 categories scored');
    ok(r.scores.overall.client != null && r.scores.overall.client < (r.scores.overall.a ?? 0), `client overall ${r.scores.overall.client} below the leader ${r.scores.overall.a}`);
    ok(!r.scores.categories.find(c => c.key === 'social')!.checked, 'social shows as not checked until entered by hand');
    ok(r.findings.length >= 5, `${r.findings.length} findings`);
    ok(r.findings.every(f => f.evidence.length > 0 || ['profile-missing', 'social'].includes(f.id)), 'every finding points at evidence');
    const evIds = new Set((await q('select id from evidence where audit_id = $1', [a.id])).map(x => x.id));
    ok(r.findings.flatMap(f => f.evidence).every(e => evIds.has(e)), 'all evidence ids exist');
    ok(r.plan.items.some(i => i.deliveredBy.name === 'Shorts agent' && i.preset === 'question'), 'plan includes the Shorts agent question preset');
    ok(r.plan.projections.every(pr => pr.mid == null || (pr.low! <= pr.mid && pr.mid <= pr.high!)), 'projections are ordered ranges');
    ok((cur.data.ai || []).length === 3 * (p.languages.length > 1 ? 6 : 5) * 2, `asked ChatGPT, Claude and Gemini every question twice (${(cur.data.ai || []).length} answers)`);
    const claudeNamed = (cur.data.ai || []).filter(x => x.assistant === 'claude' && x.mentions.includes('client')).length;
    ok(claudeNamed > 0, `recognises the business in AI answers (${claudeNamed} Claude answers name it)`);
    ok(r.report.keywords.length > 0 && r.report.map.grid.flat().some(Boolean), 'report has searches and a filled map grid');
    ok(r.report.brands[0].id === 'client' && !!r.report.brands[0].proposed, 'report has the client with a projected state');
    ok(Number(cur.cost) > 0, `records DataForSEO cost ($${Number(cur.cost).toFixed(3)})`);
    // Social numbers entered by hand, then re-scored
    await patchAudit(a.id, { manual: { client: { instagram: { followers: 300, posts90: 2 } }, a: { instagram: { followers: 9000, posts90: 30 } }, b: { instagram: { followers: 2000, posts90: 12 } } } });
    const r2 = await analyze((await getAudit(a.id))!, { skipAi: true });
    ok(r2.scores.categories.find(c => c.key === 'social')!.checked, 'social is scored once entered');
    fs.writeFileSync(`.test-out/${p.industry}.json`, JSON.stringify(r2.report, null, 1));
    fs.writeFileSync(`.test-out/${p.industry}.slug`, cur.slug);
    // Written report
    const { renderWrittenReport } = await import('../src/lib/engine/written');
    const doc = renderWrittenReport((await getAudit(a.id))!, r2, { threeDUrl: `/r/${cur.slug}` });
    ok(['Current State', 'What customers search', `90-day execution to get ${p.name} more customers`, 'About this audit'].every(t => doc.includes(t.replace(/&/g, '&amp;'))), 'written report has the renamed sections');
    ok(/Prepared by <b>/.test(doc) && doc.includes('data:image/svg+xml;base64'), 'written report shows Prepared by and the OneUpAI logo');
    ok(!/undefined|NaN|\[object Object\]/.test(doc), 'written report has no undefined or NaN values');
    ok((doc.match(/<span class="sn">\d<\/span>/g) || []).length === 9, 'written report numbers nine sections without leading zeros');
    fs.writeFileSync(`.test-out/${p.industry}-report.html`, doc);
  }

  console.log('\nView tracking');
  const { recordBeacon, viewsFor } = await import('../src/lib/tracking');
  const [tracked] = await q('select id, slug from audits where status = $1 order by created_at limit 1', ['review']);
  const H = new Headers({ 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1', 'x-vercel-ip-city': 'Fort%20Lauderdale', 'x-vercel-ip-country': 'US' });
  const beacon = (extra: object) => JSON.stringify({ s: tracked.slug, p: '3d', v: 'view12345678', u: 'visitor1', r: '', ...extra });
  ok(!(await recordBeacon(beacon({ a: 1000, e: [{ k: 'open', l: '3d' }] }), H)), 'ignores views of an unpublished report');
  await patchAudit(tracked.id, { status: 'published', published_at: new Date().toISOString() });
  ok(await recordBeacon(beacon({ a: 4000, e: [{ k: 'open', l: '3d' }, { k: 'stop', l: 'Audience' }, { k: 'plan', l: 'on' }] }), H), 'records an open with its first events');
  ok(await recordBeacon(beacon({ a: 95000, e: [{ k: 'click', l: 'YouTube' }, { k: 'bogus', l: 'x' }], end: true }), H), 'records later events and time');
  ok(!(await recordBeacon(beacon({ a: 1 }), new Headers({ 'user-agent': 'Slackbot-LinkExpanding 1.0' }))), 'ignores link-preview bots');
  const vs = await viewsFor(tracked.id);
  ok(vs.length === 1 && vs[0].device === 'Phone' && vs[0].city === 'Fort Lauderdale', `one view from a phone in Fort Lauderdale (${vs[0]?.device}, ${vs[0]?.city})`);
  ok(vs[0].active_ms === 95000 && vs[0].events.map(e => e.kind).join(',') === 'stop,plan,click', `keeps active time and events in order (${vs[0]?.active_ms} ms; ${vs[0]?.events.map(e => e.kind).join(',')})`);

  console.log('\nSample mode');
  process.env.DATAFORSEO_LOGIN = '';
  const envMod = await import('../src/lib/env');
  (envMod.env as any).dfsLogin = '';
  const s = await createAudit({ name: 'Sample Landscaping', website: 'sample.test', market: 'Tampa, FL', industry: 'landscaper', tier: 'full', languages: ['en'], social: {} });
  ok(s.sample, 'marks the audit as sample when keys are missing');
  for (let i = 0; i < 20 && await runNext(s.id); i++);
  let sc = (await getAudit(s.id))!;
  await patchAudit(s.id, { competitors: { ...sc.competitors!, confirmed: { client: sc.competitors!.clientPlace, comps: sc.competitors!.candidates.slice(0, 3) } }, status: 'running' });
  await applyConfirmed((await getAudit(s.id))!);
  for (let i = 0; i < 20 && await runNext(s.id); i++);
  sc = (await getAudit(s.id))!;
  ok(sc.status === 'review', `sample audit completes (status ${sc.status}${sc.error ? ', ' + sc.error : ''})`);
  ok(sc.results!.checks.thin[0].includes('SAMPLE'), 'review screen warns that it is sample data');
  ok(sc.results!.report.sample === true, 'report is flagged as sample');

  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
