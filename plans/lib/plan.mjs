// Loads a client's plan.json, fills in ids and totals, and refuses a plan with missing or inconsistent parts.
import fs from 'fs';
import path from 'path';

const KINDS = ['video', 'short', 'article', 'note', 'post', 'setup', 'report'];
const VENUES = ['boat-show', 'event'];
const REQUIRED = ['slug', 'client', 'brand', 'start', 'end', 'prepared', 'baselineDate', 'preparedBy', 'logo', 'goal', 'oneLine',
  'phases', 'weeks', 'calibration', 'launch', 'guide', 'approvals', 'afterMonth', 'hour', 'themes', 'profiles', 'boundaries', 'tools', 'measures'];

const longDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const shortDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// how many shorts an item stands for: "4 shorts", "A same-day short each show day (5)", else 1
const shortCount = text => { const m = /^(\d+)\b/.exec(text) || /\((\d+)\)/.exec(text); return m ? +m[1] : 1; };

export function loadPlan(dir) {
  const file = path.join(dir, 'plan.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); };

  for (const k of REQUIRED) need(raw[k] != null, `missing "${k}"`);
  // a plan copied from the template is not finished until every TODO is filled in
  const todos = []; const walk = (v, at) => { if (typeof v === 'string') { if (v.includes('TODO')) todos.push(at); } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, at ? `${at}.${k}` : k); };
  walk(raw, '');
  if (todos.length) errors.push(`${todos.length} TODO left to fill in, first at ${todos.slice(0, 3).join(', ')}`);
  if (errors.length) throw new Error(`${file}:\n  ${errors.join('\n  ')}`);

  need(/^[a-z0-9-]+$/.test(raw.slug), 'slug must be lowercase letters, digits and dashes');
  need(path.basename(dir) === raw.slug, `slug "${raw.slug}" must match its folder name "${path.basename(dir)}"`);
  need(fs.existsSync(path.join(dir, raw.logo)), `logo file "${raw.logo}" not found next to plan.json`);
  for (const d of ['start', 'end']) need(/^\d{4}-\d{2}-\d{2}$/.test(raw[d]), `${d} must be YYYY-MM-DD`);

  const phaseIds = new Set(raw.phases.map(p => p.id));
  const launchPhases = raw.phases.filter(p => p.launch);
  need(launchPhases.length === 1, 'exactly one phase needs "launch": true (the event week, e.g. a boat show)');
  for (const p of raw.phases) need(p.id && p.name && p.dates && /^#[0-9a-f]{6}$/i.test(p.color || '') && p.line, `phase "${p.id}" needs id, name, dates, a #rrggbb color and a line`);
  need(VENUES.includes(raw.launch.venue), `launch.venue must be one of: ${VENUES.join(', ')}`);
  for (const k of ['name', 'dates', 'title', 'line']) need(raw.launch[k], `launch.${k} is missing`);
  for (const k of ['before', 'during', 'after']) need(raw.launch[k] && raw.launch[k].title, `launch.${k}.title is missing`);
  need(Array.isArray(raw.launch.during?.shots) && raw.launch.during.shots.length > 0, 'launch.during.shots needs at least one shot');

  const weeks = raw.weeks.map((w, i) => {
    need(w.n === i + 1, `week ${i + 1} is numbered ${w.n}`);
    need(phaseIds.has(w.phase), `week ${w.n}: unknown phase "${w.phase}"`);
    need(/^\d{4}-\d{2}-\d{2}$/.test(w.start || ''), `week ${w.n}: start must be YYYY-MM-DD`);
    if (i > 0) need(w.start > raw.weeks[i - 1].start, `week ${w.n} starts before week ${i}`);
    for (const [k] of w.out || []) need(KINDS.includes(k), `week ${w.n}: unknown kind "${k}" (use ${KINDS.join(', ')})`);
    return {
      n: w.n, dates: w.dates, start: w.start, phase: w.phase, focus: w.focus, ...(w.note ? { note: w.note } : {}),
      you: (w.you || []).map((text, j) => ({ id: `w${w.n}y${j + 1}`, text })),
      out: (w.out || []).map(([kind, text], j) => ({ id: `w${w.n}o${j + 1}`, text, kind })),
    };
  });
  need(weeks.length > 0 && weeks[0].start === raw.start, 'week 1 must start on the plan start date');
  need(weeks.filter(w => w.phase === launchPhases[0]?.id).length >= 1, 'no week is in the launch phase');

  const outs = weeks.flatMap(w => w.out);
  const totals = {
    videos: outs.filter(o => o.kind === 'video').length,
    shorts: outs.filter(o => o.kind === 'short').reduce((s, o) => s + shortCount(o.text), 0),
    articles: outs.filter(o => o.kind === 'article').length,
  };
  if (raw.totals) for (const k of Object.keys(totals)) need(raw.totals[k] === totals[k], `totals.${k} says ${raw.totals[k]} but the weeks add up to ${totals[k]}`);

  if (errors.length) throw new Error(`${file}:\n  ${errors.join('\n  ')}`);

  const shots = raw.launch.during.shots.map((text, i) => ({ id: `shot${i + 1}`, text }));
  return {
    ...raw, weeks, totals,
    launch: { ...raw.launch, during: { ...raw.launch.during, shots } },
    launchPhase: launchPhases[0].id,
    storeKey: raw.storeKey || `${raw.slug}-90day-plan-v1`,
    checklistUrl: `${raw.slug}-90-day-plan.html`,
    voyageUrl: `${raw.slug}-90-day-plan-3d.html`,
    range: `${longDate(raw.start)} – ${longDate(raw.end)}`,
    startShort: shortDate(raw.start), endShort: shortDate(raw.end),
    logoUri: `data:image/${path.extname(raw.logo).slice(1).replace('jpg', 'jpeg').replace('svg', 'svg+xml')};base64,${fs.readFileSync(path.join(dir, raw.logo)).toString('base64')}`,
    thisWeek: raw.thisWeek || weeks[0].you.length,
  };
}

// the pages offer "How to record" next to these items
export const isRecording = text => { const t = text.toLowerCase(); return t.startsWith('record ') || t.startsWith('phone clips') || t.includes('calibration clip'); };
