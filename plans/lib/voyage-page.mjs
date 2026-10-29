// The 3D voyage page: the shell, the plan data and the bundled scene (src/voyage.js) in one file.
import fs from 'fs';
import { esc, scriptJson, themeHead } from './html.mjs';
import { guideHtml, GUIDE_CSS } from './guide.mjs';

const asset = f => fs.readFileSync(new URL(`../assets/${f}`, import.meta.url), 'utf8');
const ICON = {
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  play: '<svg class="pl" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg><svg class="pz" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
};

// what the scene reads from the page: no logo bytes, no internal-only fields
const sceneData = p => ({
  client: p.client, days: p.days, start: p.start, startShort: p.startShort, endShort: p.endShort, storeKey: p.storeKey,
  phases: p.phases, weeks: p.weeks, launchPhase: p.launchPhase,
  launch: { name: p.launch.name, dates: p.launch.dates, venue: p.launch.venue, shots: p.launch.during.shots, shotsNote: p.launch.during.note || '' },
  copy: { howto: p.copy.howto, shotsTitle: p.copy.shotsTitle, shotsHowto: p.copy.shotsHowto },
  ...(p.theme ? { theme: { font: p.theme.font, accent: p.theme.accent, accentInk: p.theme.accentInk, navy: p.theme.navy } } : {}),
});

export function voyagePage(plan, oneupLogoUri, bundle) {
  const TH = themeHead(plan.theme), ACC = plan.theme?.accent || '#e8a92e';
  const legend = plan.phases.map(p => `<span><i style="background:${p.color}"></i>${esc(p.name)}</span>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow">
${TH.link}
<title>${esc(plan.client)} · Your ${plan.days}-Day Voyage</title>
<style>${asset('voyage.css')}${GUIDE_CSS}${TH.css}</style></head>
<body>
<canvas id="gl" tabindex="0" aria-label="3D view of the ${plan.days}-day plan as a voyage: one buoy per week, from the start marina past ${esc(plan.launch.name)} to the day-${plan.days} lighthouse"></canvas>
<div id="top">
  <div class="title glass">
    <div class="logos"><img class="jl" src="${plan.logoUri}" alt="${esc(plan.brand)}"><img class="ol" src="${oneupLogoUri}" alt="OneUpAI"></div>
    <div><div class="kick">Your ${plan.days}-day voyage${plan.status ? ` · ${esc(plan.status)}` : ''}</div>
    <h1>${esc(plan.client)}</h1>
    <p>${esc(plan.range)} · ${plan.weeks.length} weeks, one buoy each</p>
    <div class="legend">${legend}</div>
    <div class="hint">Tap a buoy or a week number. Drag to look around. <button type="button" class="howto" data-guide>${esc(plan.copy.howto)}</button></div></div>
  </div>
</div>
<div id="prog" class="glass">
  <div class="pc"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#eee7db" stroke-width="5"/><circle id="ringfg" cx="24" cy="24" r="20" fill="none" stroke="${ACC}" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 126"/></svg><span id="ringpct">0%</span></div>
  <div class="txt"><b>Your progress</b><small id="ringtxt">0 checked</small></div>
  <a class="btn" href="${plan.checklistUrl}" aria-label="Checklist view">${ICON.list}<span>Checklist view</span></a>
</div>
<aside id="panel" class="glass" aria-label="Selected week">
  <button id="phandle" type="button" aria-label="Show or hide the week details"><span id="ptitle"></span><span class="chev">${ICON.chev}</span></button>
  <div id="pbody"></div>
</aside>
<div id="dock"><div class="bar glass">
  <button class="nav" id="prev" type="button" aria-label="Previous week">${ICON.prev}</button>
  <div id="chips" role="group" aria-label="Weeks"></div>
  <button class="nav" id="next" type="button" aria-label="Next week">${ICON.next}</button>
  <button id="play" type="button">${ICON.play}<span>Play voyage</span></button>
</div></div>
<div id="guide" hidden role="dialog" aria-modal="true" aria-labelledby="gtitle"><div class="gbox">
  <div class="ghead"><h2 id="gtitle">${esc(plan.copy.guideTitle)}</h2><button type="button" id="gclose" aria-label="Close">&times;</button></div>
  <p class="gline">${esc(plan.copy.guideLine)}</p>
  ${guideHtml(plan)}
</div></div>
<div id="fallback"><div><h2>Your ${plan.days}-day plan</h2><p>This 3D view needs WebGL, which this browser has turned off. Everything is in the checklist view.</p><p><a class="btn" href="${plan.checklistUrl}">Open the checklist</a></p></div></div>
<script type="application/json" id="plan-data">${scriptJson(sceneData(plan))}</script>
<script type="text/plain" id="logo-data">${plan.logoUri}</script>
<script>${bundle}</script>
</body></html>`;
}
