// The checklist page: the whole plan in the audit-report design, with check marks saved on the device.
import fs from 'fs';
import { esc, table, scriptJson, FONTS, KIND } from './html.mjs';
import { guideHtml, GUIDE_CSS } from './guide.mjs';
import { isRecording } from './plan.mjs';

const asset = f => fs.readFileSync(new URL(`../assets/${f}`, import.meta.url), 'utf8');
const ICON_3D = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c3 2 6 2 9 0s6-2 9 0"/><path d="M5 13l2-6h10l2 6"/><path d="M12 3v4"/></svg>';

let HOWTO = 'How to record';
const check = (id, text, extra = '') => {
  if (isRecording(text)) extra = `<a class="howto" href="#how-to-record">${esc(HOWTO)}</a>` + extra;
  return `<li><label class="ck"><input type="checkbox" data-id="${esc(id)}"><span class="box" aria-hidden="true"></span><span class="t">${esc(text)}</span>${extra}</label></li>`;
};
const section = (n, title, line, body, id) => `<section id="${id}"><div class="sh"><span class="sn">${n}</span><h2>${esc(title)}</h2></div><p class="line">${esc(line)}</p>${body}</section>`;
const soft = items => `<ul class="soft">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;

export function checklistPage(plan, oneupLogoUri) {
  const PH = Object.fromEntries(plan.phases.map(p => [p.id, p]));
  const t = plan.totals, L = plan.launch, by = plan.preparedBy, C = plan.copy;
  HOWTO = C.howto;

  const glance = `<div class="kpis">${[[t.videos, C.kpiVideos], [t.shorts, C.kpiShorts], [t.articles, plan.articlesLabel || 'LinkedIn articles in your words'], [C.kpiTimeN, C.kpiTime]]
    .map(([n, l]) => `<div class="kpi pos"><div class="kn">${esc(n)}</div><div class="kl">${esc(l)}</div></div>`).join('')}</div>`
    + `<div class="phases">${plan.phases.map(p => `<div class="phase${p.launch ? ' hot' : ''}" style="--pc:${p.color}"><b>${esc(p.name)}</b><span class="pd">${esc(p.dates)}</span><span>${esc(p.line)}</span></div>`).join('')}</div>`
    + '<div class="prog"><div class="pt"><b>Your progress</b><span id="progTxt">0 of 0 checked</span></div><div class="pbar"><i id="progBar"></i></div></div>'
    + `<div class="call"><b>The goal:</b> ${esc(plan.goal)}</div>`;

  const w1 = plan.weeks[0];
  const thisWeek = `<ul class="checks">${w1.you.slice(0, plan.thisWeek).map(i => check(i.id, i.text)).join('')}</ul>`
    + (plan.later?.length ? `<p class="sub">Whenever you're ready, no rush:</p>${soft(plan.later)}` : '');

  const K = plan.calibration;
  const calibration = `<p>${esc(K.intro || `Before your first full recording, we'd like one short clip of you talking. We use it to set up your edits: caption style, pacing, framing for vertical video, music and your on-screen name. You'll get sample edits to react to by ${K.samplesBy}, so every video after looks and sounds the way you want.`)}</p>`
    + `<ol class="topics">${K.topics.map(([a, b]) => `<li><b>${esc(a)}:</b> ${esc(b)}</li>`).join('')}</ol>`
    + (K.setup === false ? '' : `<p class="gsend"><b>Setting up:</b> phone sideways at eye level, ${esc(plan.guide.distanceLong || 'about 3 to 4 feet away')}, light in front of you. <a href="#how-to-record">See How to record</a> for the details.</p>`);

  const weekCard = w => {
    const p = PH[w.phase];
    return `<article class="week" id="week-${w.n}" data-start="${w.start}" style="--pc:${p.color}">`
      + `<header><span class="wn">Week ${w.n}</span><span class="wd">${esc(w.dates)}</span><span class="chip">${esc(p.name)}</span><span class="now">This week</span><span class="wp" data-week="${w.n}">0/0</span></header>`
      + `<h3>${esc(w.focus)}</h3>${w.note ? `<p class="wnote">${esc(w.note)}</p>` : ''}`
      + `<div class="cols"><div><h4>Your part</h4><ul class="checks">${w.you.map(i => check(i.id, i.text)).join('')}</ul></div>`
      + `<div><h4>What goes out</h4><ul class="checks out">${w.out.map(o => check(o.id, o.text, `<em class="kind k-${o.kind}">${KIND[o.kind]}</em>`)).join('')}</ul></div></div></article>`;
  };
  const weeks = `<div class="weeks">${plan.weeks.map(weekCard).join('')}</div>${plan.weeksNote ? `<p class="src">${esc(plan.weeksNote)}</p>` : ''}`;

  const launch = `<h4 class="h4">${esc(L.before.title)}</h4>${soft(L.before.items || [])}`
    + `<h4 class="h4">${esc(L.during.title)}</h4>${L.during.note ? `<p class="sub">${esc(L.during.note)}</p>` : ''}`
    + `<ul class="checks">${L.during.shots.map(s => check(s.id, s.text)).join('')}</ul>`
    + `<h4 class="h4">${esc(L.after.title)}</h4>${soft(L.after.items || [])}`;

  const approvals = `<ol class="steps">${plan.approvals.map(([a, b]) => `<li><b>${esc(a)}:</b> ${esc(b)}</li>`).join('')}</ol><div class="call"><b>After the first month:</b> ${esc(plan.afterMonth)}</div>`;
  const profiles = `<p><b>One line, used everywhere:</b> ${esc(plan.oneLine)}</p>` + table(['Platform', 'Name shown', 'Handle', 'Bio or headline'], plan.profiles)
    + (plan.boundaries.length ? `<p class="sub">Your boundaries, built in:</p>${soft(plan.boundaries)}` : '');

  const SECTIONS = [
    ['At a glance', `${plan.span}, ${['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'][plan.phases.length] || plan.phases.length} phases, ${C.glanceTime}.`, glance, 'glance'],
    ...(plan.target ? [[plan.target.title, plan.target.line, table(plan.target.head, plan.target.rows, 'n2') + (plan.target.note ? `<p class="src">${esc(plan.target.note)}</p>` : ''), 'target']] : []),
    ['This week', 'A few quick things to get started.', thisWeek, 'this-week'],
    [K.title || 'Your calibration clip', K.line || `A 5–10 minute clip of you talking, due ${K.due}.`, calibration, 'calibration'],
    [C.guideTitle, C.guideLine, guideHtml(plan), 'how-to-record'],
    ['Week by week', 'Check things off as you go; your progress saves on this device.', weeks, 'weeks'],
    [L.title, L.line, launch, 'launch'],
    ...(plan.cadence ? [[plan.cadence.title, plan.cadence.line, table(plan.cadence.head, plan.cadence.rows, 'wide1') + (plan.cadence.note ? `<p class="src">${esc(plan.cadence.note)}</p>` : ''), 'cadence']] : []),
    ['How approvals work', "For the first month, nothing goes live until you've approved it.", approvals, 'approvals'],
    [C.hourTitle, C.hourLine, table(['Each month', 'Time', 'What it is'], plan.hour, 'n2'), 'hour'],
    [C.themesTitle, 'Four themes, every topic taken from your own answers.', table(['Theme', 'Share', 'Topics from your answers'], plan.themes, 'wide1 n2'), 'themes'],
    ["How you'll show up", plan.profilesLine || `Your name leads; ${plan.brand} is the brand around it.`, profiles, 'profiles'],
    ['What we do for you', C.toolsLine, table(['Tool', 'What it makes', 'From', 'Where it goes'], plan.tools), 'tools'],
    ["What we'll measure", `Where you start, and what you'll have at day ${plan.days}.`, table(['Measure', `Today (${plan.baselineDate})`, `Day ${plan.days}`], plan.measures)
      + '<p class="src">Each month you get a short report: what went out, where you come up in searches, and how your audience and inquiries are moving.</p>', 'measure'],
  ];
  const body = SECTIONS.map(([a, b, c, d], i) => section(i + 1, a, b, c, d)).join('');
  const nav = `<nav class="jump" aria-label="Sections">${SECTIONS.slice(0, 7).map(([a, , , d]) => `<a href="#${d}">${esc(a)}</a>`).join('')}</nav>`;
  const js = asset('checklist.js').replace('__KEY__', scriptJson(plan.storeKey)).replace('__START__', scriptJson(plan.start));

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">${FONTS}<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(plan.client)} · Your ${plan.days}-Day Plan</title>
<style>${asset('report.css')}${asset('checklist.css')}${GUIDE_CSS}</style></head>
<body>
<header class="hero"><div class="wrap">
 <div class="toprow"><img class="clogo" src="${plan.logoUri}" alt="${esc(plan.brand)}"><img class="olog" src="${oneupLogoUri}" alt="OneUpAI"></div>
 <p class="kicker">${plan.days}-day plan · ${esc(plan.range)}${plan.status ? ` · ${esc(plan.status)}` : ''}</p>
 <h1>${esc(plan.client)}: Your ${plan.days}-Day Plan</h1>
 <p class="meta">Prepared for <b>${esc(plan.client)}</b> · Prepared by <b>${esc(by.name)}, ${esc(by.company)}</b> · ${esc(plan.prepared)}</p>
 <div class="hero-actions"><a class="btn gold" href="${plan.voyageUrl}">${ICON_3D}Open the 3D voyage</a><a class="btn" href="#this-week">Start with this week</a>${plan.agreement ? `<a class="btn" href="${plan.agreementUrl}">Agreement and payment</a>` : ''}</div>
</div></header>
${nav}
<main>${body}</main>
<footer><span>Prepared by ${esc(by.name)}, ${esc(by.company)} · ${esc(by.email)}</span><span><button class="reset" id="reset" type="button">Clear my check marks</button></span></footer>
<script>${js}</script>
</body></html>`;
}
