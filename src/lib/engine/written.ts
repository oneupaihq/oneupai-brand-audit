import type { AuditRow } from '../audits';
import { identities, whoIs } from '../audits';
import { ONEUPAI_LOGO_DATA_URL, PREPARED_BY, PREPARED_EMAIL } from '../brand';
import type { BrandId, Finding, Results } from '../types';
import { fmtNum, median } from '../util';

// The written report: the same audit as the 3D page, as a document a prospect can read, print or
// save as PDF. Every figure comes from the stored results; missing data reads "Not checked".
// Style rules (agreed with Nick): numbered sections without leading zeros, one summary line per
// section, values centered in every column but the first, no gray text.

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const NC = 'Not checked';
const DASH = '–';
const YES = '<span class="ok">Yes</span>';
const NO = '<span class="no">No</span>';
const yn = (v: boolean | null | undefined) => (v == null ? NC : v ? YES : NO);
const fmtUsers = (n: number | null) => (n == null ? DASH : n >= 1e9 ? `${+(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${Math.round(n / 1e6)}M` : fmtNum(n));
const scoreCls = (v: number | null | undefined) => (v == null ? '' : v >= 80 ? 'ok' : v >= 50 ? 'mid' : 'no');
const SEV = { high: 0, medium: 1, low: 2 } as const;
const PHASE = { foundations: 'Days 1–30', pace: 'Days 31–60', compound: 'Days 61–90' } as const;
const STATUS = { active: '<span class="ok">Active</span>', weak: '<span class="mid">Weak</span>', none: '<span class="no">Not present</span>', unknown: NC } as const;

function table(head: string[], rows: string[][], cls = '') {
  const h = head.map(c => `<th scope="col">${c}</th>`).join('');
  const b = rows.map(r => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('');
  return `<div class="tw"><table class="${cls}"><thead><tr>${h}</tr></thead><tbody>${b}</tbody></table></div>`;
}
const exhibit = (n: number, title: string, body: string, note = '') => `<figure class="ex"><figcaption><span class="exn">Exhibit ${n}</span>${esc(title)}</figcaption>${body}${note ? `<p class="src">${note}</p>` : ''}</figure>`;
const section = (n: number, title: string, line: string, body: string, key: string) => `<section data-track="${key}"><div class="sh"><span class="sn">${n}</span><h2>${esc(title)}</h2></div><p class="line">${line}</p>${body}</section>`;

export function renderWrittenReport(a: AuditRow, r: Results, opts: { threeDUrl?: string; tracking?: string } = {}): string {
  const rep = r.report;
  const d = a.data;
  const ids = identities(a).filter(i => d.brands[i.id]);
  const present = ids.map(i => i.id);
  const comps = present.filter(i => i !== 'client');
  const nameOf = (id: BrandId | null) => (id ? rep.brands.find(b => b.id === id)?.name || id : 'None of these businesses');
  const nm = rep.client.name;
  const client = rep.brands.find(b => b.id === 'client')!;
  const cat = (k: string) => r.scores.categories.find(c => c.key === k);
  const hidden = new Set(a.overrides?.hiddenFindings || []);
  const findings: Finding[] = r.findings.filter(f => !hidden.has(f.id)).sort((x, y) => SEV[x.severity] - SEV[y.severity]);
  let ex = 0;
  const X = (title: string, body: string, note = '') => exhibit(++ex, title, body, note);
  const date = new Date(r.computedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // ---------- 1. Current state
  const reviewMed = median(comps.map(c => d.brands[c]?.place?.reviews).filter((x): x is number => x != null));
  const owned = rep.keywords.filter(k => k.owner === 'client').length;
  const videoMonths = client.months.filter(Boolean).length;
  const ytChecked = d.brands.client?.youtube !== undefined;
  const topComp = comps.map(c => ({ c, v: r.scores.overall[c] ?? null })).filter(x => x.v != null).sort((x, y) => y.v! - x.v!)[0];
  const kpis: { n: string; l: string; bad: boolean }[] = [
    { n: client.reviews == null ? DASH : fmtNum(client.reviews), l: client.reviews == null ? 'Google reviews: not checked' : `Google reviews${client.rating ? ` at ${client.rating}` : ''}; competitor median ${fmtNum(reviewMed)}`, bad: client.reviews != null && reviewMed != null && client.reviews < reviewMed },
    { n: rep.keywords.length ? `${owned} of ${rep.keywords.length}` : DASH, l: rep.keywords.length ? `Main searches where ${esc(nm)} ranks first` : 'Searches: not checked', bad: rep.keywords.length > 0 && owned < rep.keywords.length / 2 },
    { n: ytChecked ? String(videoMonths) : DASH, l: ytChecked ? 'Months with a YouTube upload, last 12' : 'YouTube: not checked', bad: ytChecked && videoMonths < 6 },
    rep.ai.total
      ? { n: `${rep.ai.clientNamed} of ${rep.ai.total}`, l: 'AI assistant answers that name the business', bad: rep.ai.clientNamed < rep.ai.total / 4 }
      : { n: String(rep.map.grid.flat().filter(x => x === 'client').length), l: `Map spots in the top 3, of ${rep.map.n * rep.map.n}`, bad: true },
  ];
  const kpiHtml = `<div class="kpis">${kpis.map(k => `<div class="kpi ${k.bad ? 'neg' : 'pos'}"><div class="kn">${k.n}</div><div class="kl">${k.l}</div></div>`).join('')}</div>`;
  const scoreRows = r.scores.categories.map(c => {
    const v = c.values.client, md = c.median;
    return [esc(c.label), esc(c.unit), c.checked ? (v == null ? DASH : fmtNum(Math.round(v * 10) / 10)) : NC, c.checked ? (md == null ? DASH : fmtNum(Math.round(md * 10) / 10)) : NC,
      c.checked && c.scores.client != null ? `<span class="${scoreCls(c.scores.client)}">${c.scores.client}</span>` : NC];
  });
  const s1 = kpiHtml
    + X('Scorecard against local competitors', table(['Area', 'Measure', esc(nm), 'Competitor median', 'Score'], scoreRows, 'score'), 'A score of 100 means at or above the competitor median. "Not checked" areas are left out of the overall score.')
    + (r.brief?.headline && !r.brief.headline.startsWith(`${nm} scores`) ? `<div class="call"><b>The opportunity:</b> ${esc(r.brief.headline)}</div>` : '');
  const line1 = `${esc(nm)} scores ${client.overall ?? 'n/a'} of 100${topComp ? `; ${esc(nameOf(topComp.c))} scores ${topComp.v}` : ''}.`;

  // ---------- 2. Reputation
  const revs = present.map(id => ({ id, n: d.brands[id]?.place?.reviews ?? null, rating: d.brands[id]?.place?.rating ?? null })).filter(x => x.n != null) as { id: BrandId; n: number; rating: number | null }[];
  const maxRev = Math.max(1, ...revs.map(x => x.n));
  const bars = `<div class="bars">${revs.sort((x, y) => y.n - x.n).map(x => `<div class="br"><span class="bn">${esc(nameOf(x.id))}</span><span class="bt"><i class="${x.id === 'client' ? 'k' : 'g'}" style="width:${((x.n / maxRev) * 100).toFixed(1)}%"></i></span><span class="bv">${fmtNum(x.n)}</span></div>`).join('')}</div>`;
  const revCat = cat('reviews');
  const s2 = (revs.length ? X('Google reviews', bars, 'Source: Google Business Profiles.') : '')
    + X('Reputation by business', table(['Business', 'Google reviews', 'Rating', 'Score'], present.map(id => [id === 'client' ? `<b>${esc(nameOf(id))}</b>` : esc(nameOf(id)), fmtNum(d.brands[id]?.place?.reviews ?? null), d.brands[id]?.place?.rating != null ? String(d.brands[id]!.place!.rating) : DASH, revCat?.checked && revCat.scores[id] != null ? `<span class="${scoreCls(revCat.scores[id])}">${revCat.scores[id]}</span>` : NC])));
  const line2 = client.reviews == null ? 'Google reviews were not checked in this audit.' : `${fmtNum(client.reviews)} Google reviews against a competitor median of ${fmtNum(reviewMed)}.`;

  // ---------- 3. What customers search
  const pos = (term: string) => (d.serp || []).find(x => x.keyword === term)?.organic.find(o => whoIs(ids, { domain: o.domain }) === 'client')?.rank ?? null;
  const kwRows = rep.keywords.map(k => {
    const p = pos(k.term);
    return [esc(k.term), k.volume == null ? NC : fmtNum(k.volume), k.owner === 'client' ? `<b>${esc(nm)}</b>` : esc(nameOf(k.owner)), p == null ? '<span class="no">Not on page 1</span>' : p <= 10 ? `#${p}` : `<span class="no">#${p}</span>`,
      k.video ? (k.videoOwner ? esc(nameOf(k.videoOwner)) : '<b>Open</b>') : 'No'];
  });
  const s3 = rep.keywords.length ? X('Main searches near ' + (d.city || a.market), table(['Search', 'Monthly searches', 'Ranks first', `${esc(nm)} position`, 'Video results'], kwRows), 'Monthly searches are Google estimates for the area. "Open" means Google shows videos but no local business owns one yet.') : `<p>${NC}.</p>`;
  const line3 = rep.keywords.length ? `${esc(nm)} ranks first on ${owned} of ${rep.keywords.length} main searches.` : 'Searches were not checked in this audit.';

  // ---------- 4. Website
  const site = (id: BrandId) => d.brands[id]?.site;
  const col = (fn: (id: BrandId) => string) => present.map(fn);
  const webRows: string[][] = [
    ['Tap-to-call phone number', ...col(id => (site(id)?.ok ? yn(site(id)!.hasPhoneLink) : NC))],
    ['FAQ for customers', ...col(id => (site(id)?.ok ? yn(site(id)!.hasFaq) : NC))],
    ['Video on the site', ...col(id => (site(id)?.ok ? yn(site(id)!.videoEmbeds > 0) : NC))],
    ['Local business markup', ...col(id => (site(id)?.ok ? yn(site(id)!.hasSchemaLocalBusiness) : NC))],
    [`Mentions ${esc(d.city || 'the city')}`, ...col(id => (site(id)?.ok ? yn(site(id)!.mentionsCity) : NC))],
    ['Spanish-language content', ...col(id => (site(id)?.ok ? yn(site(id)!.spanish) : NC))],
    ['Mobile speed score', ...col(id => { const v = d.brands[id]?.speed?.performance; return v == null ? NC : `<span class="${scoreCls(v)}">${v}</span>`; })],
  ];
  const cr = d.contentReview?.checks || [];
  const RES = { pass: '<span class="ok">Pass</span>', partial: '<span class="mid">Partial</span>', fail: '<span class="no">Missing</span>' } as const;
  const s4 = X('Website checks', table(['Check', ...present.map(id => (id === 'client' ? `<b>${esc(nameOf(id))}</b>` : esc(nameOf(id))))], webRows), 'Source: each home page, and Google PageSpeed (mobile) for speed.')
    + (cr.length ? X(`${nm}: content review`, table(['Item', 'Result', 'What we found'], cr.map(c => [esc(c.item), RES[c.result], esc(c.note) + (c.quote ? ` <q>${esc(c.quote)}</q>` : '')])), 'Every quote is copied word for word from the site.') : '');
  const passed = webRows.slice(0, 6).filter(r0 => r0[1] === YES).length;
  const speed = d.brands.client?.speed?.performance;
  const line4 = site('client')?.ok ? `${passed} of 6 website checks passed${speed != null ? `; mobile speed ${speed} of 100` : ''}.` : 'The website could not be checked.';

  // ---------- 5. Platforms
  const checkedPlat = rep.platforms.filter(p => p.status !== 'unknown');
  const activeNow = rep.platforms.filter(p => p.status === 'active');
  const s5 = X('Presence by platform', table(['Platform', `${esc(nm)} today`, 'What we found', 'Monthly audience', 'Fit'], rep.platforms.map(p => [esc(p.name), STATUS[p.status], esc(p.note), p.users ? `${fmtUsers(p.users)}${p.usersLabel && !/monthly/.test(p.usersLabel) ? ` ${esc(p.usersLabel)}` : ''}` : esc(p.usersLabel || DASH), p.fit === 'High' ? '<b>High</b>' : p.fit])),
    'Audience figures are the platforms\' own published numbers where available, otherwise estimates.');
  const line5 = `Active on ${activeNow.length} of ${checkedPlat.length} platforms checked.`;

  // ---------- 6. What is holding the business back
  const s6 = findings.length ? `<ol class="gaps">${findings.map(f => `<li><b>${esc(f.title)}${/[.!?]$/.test(f.title) ? '' : '.'}</b> ${esc(f.detail)}</li>`).join('')}</ol>` : '<p>No gaps were found in the areas checked.</p>';
  const line6 = findings.length ? `${findings.length} gaps, most important first.` : 'No gaps were found in the areas checked.';

  // ---------- 7. 90-day execution
  const phases = (['foundations', 'pace', 'compound'] as const).map(ph => ({ ph, items: r.plan.items.filter(i => i.phase === ph) }));
  const PH_TEXT = { foundations: 'Foundations: fix the profile, pages and listings; start the first videos.', pace: 'Weekly pace: short videos on every platform, aimed at the target searches.', compound: 'Compound: expand what works, add languages and optional ads.' } as const;
  const timeline = `<div class="tl">${phases.map((p, i) => `<div class="ph p${i + 1}"><b>${PHASE[p.ph]}</b><span>${PH_TEXT[p.ph]} ${p.items.length} action${p.items.length === 1 ? '' : 's'}.</span></div>`).join('')}</div>`;
  const ORDER = { foundations: 0, pace: 1, compound: 2 } as const;
  const planRows = [...r.plan.items].sort((x, y) => ORDER[x.phase] - ORDER[y.phase]).map(i => [esc(i.action), PHASE[i.phase], esc(i.deliveredBy.name + (i.preset ? ` (${i.preset})` : '')), esc(i.metric)]);
  const projRows = r.plan.projections.filter(p => p.mid != null && p.current !== p.mid).map(p => [esc(cat(p.category)?.label || p.category), p.current == null ? DASH : String(p.current), `<b>${p.mid}</b>`, `${p.low}–${p.high}`]);
  const s7 = timeline
    + X('90-day execution plan', table(['Action', 'Timing', 'Delivered by', 'Measured by'], planRows, 'plan'))
    + (projRows.length ? X('Projected scores after 90 days', table(['Area', 'Today', 'Projected', 'Range'], projRows), 'Projections are ranges from fixed rules, not guarantees. Results are measured every month against this baseline.') : '')
    + (r.plan.ongoing.length ? `<p class="sub"><b>Then ongoing</b></p><ul class="plain">${r.plan.ongoing.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : '');
  const line7 = 'Month one fixes the foundations; months two and three build a weekly video pace.';

  // ---------- 8. Measurement
  const s8 = X('Measurement framework', table(['Level', 'What is measured', 'Source'], [
    ['<b>Output</b>', 'Videos made and posted, by platform', 'OneUp platform records'],
    ['<b>Visibility</b>', 'Searches ranked, map position, AI answers, reviews', 'This audit, re-run monthly'],
    ['<b>Engagement</b>', 'Profile calls and clicks, video views, website visits by source', 'Google Business Profile, YouTube, Google Analytics'],
    ['<b>Customers</b>', 'Leads, bookings or sales, by source', 'The business\'s own records'],
  ])) + (r.plan.salesMetrics.length ? `<p class="sub"><b>Tracked for ${esc(nm)}</b></p><ul class="plain">${r.plan.salesMetrics.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '');
  const line8 = 'Four levels, from videos published to customers, tracked monthly against this baseline.';

  // ---------- 9. About
  const seen = new Set<string>();
  const sources = Object.values(rep.evidence).filter(e => { const k = e.url || e.label; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
  const s9 = (a.sample ? '<p class="warn"><b>Sample data.</b> This report was generated without live data sources and is for demonstration only.</p>' : '')
    + (r.checks.thin.length ? `<p class="sub"><b>Not checked or limited data</b></p><ul class="plain">${r.checks.thin.filter(t => !/SAMPLE/.test(t)).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '')
    + `<p class="sub"><b>Sources</b></p><ul class="sources">${sources.map(e => `<li>${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noreferrer">${esc(e.label)}</a>` : esc(e.label)} · ${esc(e.source)} · ${esc(e.date)}</li>`).join('')}</ul>`;
  const line9 = `Collected on ${date} from public sources; every figure is traceable to a source.`;

  const sections: [string, string, string, string][] = [
    ['Current State', line1, s1, 'current'],
    ['Reputation', line2, s2, 'reputation'],
    ['What customers search', line3, s3, 'searches'],
    ['Website', line4, s4, 'website'],
    ['Social, video and AI platforms', line5, s5, 'platforms'],
    [`What is holding ${nm} back`, line6, s6, 'gaps'],
    [`90-day execution to get ${nm} more customers`, line7, s7, 'plan'],
    ['How results are measured', line8, s8, 'measurement'],
    ['About this audit', line9, s9, 'about'],
  ];
  const body = sections.map(([t, l, b, k], i) => section(i + 1, t, l, b, k)).join('');
  const contact = a.inputs.contact?.trim();
  const meta = `${contact ? `Prepared for <b>${esc(contact)}</b> · ` : ''}Prepared by <b>${esc(PREPARED_BY)}</b> · ${esc(date)}`;
  const status = a.sample ? 'Sample data' : a.tier === 'quick' ? 'Quick audit' : 'Presence audit';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(nm)} · Online Presence Audit</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap">
<style>${CSS}</style></head>
<body>
<header class="hero"><div class="wrap">
 <div class="toprow">${rep.client.logo ? `<img class="clogo" src="${esc(rep.client.logo)}" alt="${esc(nm)}">` : `<span class="cname">${esc(nm)}</span>`}<img class="olog" src="${ONEUPAI_LOGO_DATA_URL}" alt="OneUpAI"></div>
 <p class="kicker">Online presence audit · ${esc(a.market)}</p>
 <h1>${esc(nm)}</h1>
 <p class="meta">${meta}</p>
 <span class="status">${status}</span>${opts.threeDUrl ? ` <a class="open3d" data-track="open-3d" href="${esc(opts.threeDUrl)}">Open the interactive 3D view</a>` : ''}
</div></header>
<main>${body}</main>
<footer><span>Prepared by ${esc(PREPARED_BY)} · ${esc(PREPARED_EMAIL)}</span><span>Confidential · ${esc(nm)}</span></footer>
${opts.tracking || ''}
</body></html>`;
}

const CSS = `
:root { --bg: #f4f8f9; --paper: #fffdf9; --ink: #1d2430; --navy: #0f2c4a; --line: #e4ded4; --gold: #b87c0b; --goldfill: #e8a92e; --good: #2f8a5b; --mid: #9a6400; --bad: #c2463a; }
* { box-sizing: border-box; }
html { background: var(--bg); -webkit-text-size-adjust: 100%; }
body { margin: 0; color: var(--ink); font: 16px/1.55 "Archivo", "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }
a { color: #0f5f79; }
.hero { background: linear-gradient(160deg, #4fb8e0 0%, #9fdcf0 55%, #e4f6f9 100%); padding: 36px 16px 44px; }
.wrap { max-width: 980px; margin: 0 auto; }
.toprow { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.clogo { display: block; max-width: min(300px, 62vw); max-height: 110px; height: auto; background: #fff; border-radius: 14px; padding: 14px 18px; box-shadow: 0 6px 20px rgba(10,26,110,.12); }
.cname { font-size: 20px; font-weight: 800; color: var(--navy); background: #fff; border-radius: 14px; padding: 14px 18px; }
.olog { height: 40px; width: auto; display: block; flex: none; margin-top: 6px; }
.kicker { font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: var(--navy); margin: 22px 0 0; }
h1 { font-size: clamp(30px, 5vw, 46px); line-height: 1.08; margin: 12px 0 8px; letter-spacing: -.02em; color: var(--navy); }
.meta { color: #23445e; font-size: 16px; margin: 0; }
.meta b { color: var(--navy); }
.status { display: inline-block; margin-top: 12px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #7a4f00; background: #fff3d6; border: 1px solid #f0d9a8; border-radius: 99px; padding: 3px 10px; }
.open3d { display: inline-block; margin: 12px 0 0 8px; font-size: 13px; font-weight: 700; color: var(--navy); }
main { max-width: 980px; margin: 0 auto; padding: 8px 16px 40px; }
section { background: var(--paper); border: 1px solid var(--line); border-radius: 16px; padding: 26px 28px; margin: 18px 0; }
.sh { display: flex; align-items: baseline; gap: 10px; }
.sn { color: var(--gold); font-weight: 800; font-size: 22px; }
h2 { font-size: 22px; margin: 0; letter-spacing: -.01em; }
.line { margin: 6px 0 16px; font-size: 17px; font-weight: 600; }
.sub { margin: 18px 0 6px; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 4px 0 20px; }
.kpi { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 16px 14px; box-shadow: 0 8px 24px rgba(20,60,80,.08); text-align: center; }
.kpi.pos { background: #fff7e3; border-color: #f0d9a8; }
.kn { font-size: 36px; font-weight: 800; line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; margin-bottom: 8px; }
.kpi.pos .kn { color: var(--gold); }
.kpi.neg .kn { color: var(--bad); }
.kl { font-size: 13px; }
.call { background: #eef7f2; border: 1px solid #cfe8da; border-radius: 12px; padding: 14px 16px; margin: 14px 0 4px; }
.call b { color: var(--good); }
.warn { background: #fff3d6; border: 1px solid #f0d9a8; border-radius: 12px; padding: 12px 14px; }
.ex { margin: 10px 0 18px; }
figcaption { font-size: 13px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; margin: 18px 0 8px; }
.exn { color: var(--gold); margin-right: 8px; }
.src { font-size: 13px; margin: 8px 0 0; }
.tw { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 9px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
thead th { font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; border-bottom: 2px solid var(--line); text-align: center; }
thead th:first-child, tbody th { text-align: left; }
tbody th { font-weight: 600; }
tbody td { text-align: center; }
table.plan tbody th { width: 46%; }
table.plan td:nth-child(2) { white-space: nowrap; }
q { font-style: italic; }
.ok { color: var(--good); font-weight: 700; }
.mid { color: var(--mid); font-weight: 700; }
.no { color: var(--bad); font-weight: 700; }
.bars { padding: 8px 0 4px; }
.br { display: grid; grid-template-columns: 220px 1fr 60px; align-items: center; gap: 14px; margin-bottom: 10px; font-size: 14px; font-weight: 600; }
.bt { height: 16px; background: #eee7db; border-radius: 8px; overflow: hidden; position: relative; }
.bt i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 8px; }
.bt i.k { background: var(--goldfill); }
.bt i.g { background: #4a7fe0; }
.bv { text-align: center; font-weight: 800; font-variant-numeric: tabular-nums; }
.gaps { padding-left: 22px; margin: 8px 0 0; }
.gaps li { margin: 0 0 10px; }
.gaps li::marker { color: var(--gold); font-weight: 800; }
.plain { margin: 4px 0 0; padding-left: 20px; }
.plain li { margin-bottom: 4px; }
.tl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 4px 0 8px; }
.ph { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; font-size: 13.5px; line-height: 1.4; background: #fff; }
.ph b { display: block; color: var(--gold); font-size: 13px; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 4px; }
.ph.p3 { background: #fff7e3; border-color: #f0d9a8; }
.sources { margin: 8px 0 0; padding-left: 18px; font-size: 13px; }
footer { max-width: 980px; margin: 0 auto; padding: 0 16px 48px; font-size: 13px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
@media (max-width: 760px) {
  .olog { height: 28px; }
  .kpis { grid-template-columns: 1fr 1fr; }
  section { padding: 20px 16px; }
  .tl { grid-template-columns: 1fr; }
  .br { grid-template-columns: 120px 1fr 48px; }
}
@media print {
  html, body { background: #fff; } .hero { background: none; padding: 10px 0 20px; } .open3d { display: none; }
  section { break-inside: avoid; } .tw { overflow: visible; }
}
`;
