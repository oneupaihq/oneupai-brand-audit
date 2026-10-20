// The "How to record" guide: two drawings plus the client's recording steps. Used by both pages.
import { esc } from './html.mjs';

const NAVY = '#0f2c4a', GOLD = '#b87c0b', GOLDF = '#e8a92e', LINE = '#e4ded4';

// side view: eye level to the lens, 3 to 4 feet apart
const SVG_SETUP = `<svg viewBox="0 0 360 210" role="img" aria-label="Side view: phone on a small tripod at eye level, about 3 to 4 feet in front of you">
<rect x="0" y="0" width="360" height="210" rx="14" fill="#f3fafc"/>
<rect x="236" y="22" width="92" height="40" rx="8" fill="#fff6dc" stroke="${GOLDF}"/>
<text x="282" y="47" text-anchor="middle" font-size="12" font-weight="700" fill="${GOLD}">Window / lamp</text>
<path d="M282 62 L282 74" stroke="${GOLDF}" stroke-width="2"/>
<path d="M36 196 C36 150 48 128 82 120 C116 128 128 150 128 196 Z" fill="${NAVY}"/>
<circle cx="82" cy="92" r="22" fill="${NAVY}"/>
<circle cx="96" cy="88" r="3" fill="#fff"/>
<line x1="100" y1="88" x2="268" y2="88" stroke="${GOLDF}" stroke-width="2" stroke-dasharray="5 5"/>
<text x="184" y="80" text-anchor="middle" font-size="12" font-weight="700" fill="${GOLD}">eye level</text>
<rect x="268" y="74" width="9" height="30" rx="2" fill="${NAVY}"/>
<line x1="272" y1="104" x2="272" y2="150" stroke="${NAVY}" stroke-width="3"/>
<line x1="272" y1="150" x2="252" y2="196" stroke="${NAVY}" stroke-width="3"/>
<line x1="272" y1="150" x2="292" y2="196" stroke="${NAVY}" stroke-width="3"/>
<line x1="272" y1="150" x2="272" y2="196" stroke="${NAVY}" stroke-width="3"/>
<line x1="112" y1="140" x2="256" y2="140" stroke="#5d6878" stroke-width="1.5"/>
<path d="M112 140 l8 -5 v10 z M256 140 l-8 -5 v10 z" fill="#5d6878"/>
<rect x="150" y="128" width="68" height="24" rx="12" fill="#fff" stroke="${LINE}"/>
<text x="184" y="145" text-anchor="middle" font-size="13" font-weight="800" fill="${NAVY}">3–4 ft</text>
</svg>`;

// front view: what the phone sees, with the vertical crop used for shorts
const SVG_FRAME = `<svg viewBox="0 0 360 210" role="img" aria-label="What the camera sees: you centered from mid-chest up, with a little space above your head. We crop the middle for vertical shorts">
<rect x="0" y="0" width="360" height="210" rx="14" fill="#f3fafc"/>
<rect x="40" y="18" width="280" height="158" rx="6" fill="#dff1f6" stroke="${NAVY}" stroke-width="2"/>
<path d="M118 176 C118 140 140 124 180 118 C220 124 242 140 242 176 Z" fill="${NAVY}"/>
<circle cx="180" cy="86" r="27" fill="${NAVY}"/>
<rect x="135" y="18" width="90" height="158" fill="none" stroke="${GOLDF}" stroke-width="2.5" stroke-dasharray="7 5"/>
<text x="180" y="196" text-anchor="middle" font-size="12" font-weight="700" fill="${GOLD}">Gold box: the part we use for vertical shorts</text>
</svg>`;

export const GUIDE_CSS = `
.guide-figs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 6px 0 14px; }
.guide-figs figure { margin: 0; }
.guide-figs svg { display: block; width: 100%; height: auto; font-family: inherit; }
.guide-figs figcaption { font-size: 13px; color: #3c4a5c; margin-top: 6px; text-transform: none; letter-spacing: 0; font-weight: 600; }
.guide-cards { display: grid; grid-template-columns: 1.25fr 1fr; gap: 12px; }
.gcard { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; }
.gcard h4 { margin: 0; font-size: 16px; color: var(--navy); }
.gcard .when { margin: 2px 0 10px; font-size: 12.5px; color: var(--gold); font-weight: 700; }
.gcard ol { margin: 0; padding-left: 20px; }
.gcard li { margin: 0 0 8px; font-size: 14px; line-height: 1.45; }
.gcard li::marker { color: var(--gold); font-weight: 800; }
.gcard li b { color: var(--navy); }
.gcard .set { margin: 8px 0 0; font-size: 13px; color: #3c4a5c; background: #fbf7ef; border-radius: 8px; padding: 8px 10px; }
.gsend { margin: 12px 0 0; background: #eef7f2; border: 1px solid #cfe8da; border-radius: 12px; padding: 12px 14px; font-size: 14.5px; }
.gsend b { color: var(--good); }
.howto { flex: none; align-self: center; font-size: 12px; font-weight: 700; color: var(--gold); text-decoration: none; border: 1px solid #f0d9a8; background: #fff7e3; border-radius: 99px; padding: 2px 9px; white-space: nowrap; cursor: pointer; font-family: inherit; }
.howto:hover { border-color: var(--goldfill); }
@media (max-width: 760px) { .guide-figs, .guide-cards { grid-template-columns: 1fr; } }
`;

const card = g => `<div class="gcard"><h4>${esc(g.title)}</h4><p class="when">${esc(g.when)}</p><ol>${g.steps.map(([a, b]) => `<li><b>${esc(a)}.</b> ${esc(b)}</li>`).join('')}</ol>${g.setting ? `<p class="set">${esc(g.setting)}</p>` : ''}</div>`;

export const guideHtml = plan => {
  const g = plan.guide;
  return '<div class="guide-figs">'
    + `<figure>${SVG_SETUP}<figcaption>The setup: lens at eye level, light in front of you.</figcaption></figure>`
    + `<figure>${SVG_FRAME}<figcaption>The frame: centered, mid-chest up, a little headroom.</figcaption></figure>`
    + '</div>'
    + `<div class="guide-cards">${card(g.sit)}${card(g.clips)}</div>`
    + `<p class="gsend"><b>Sending it:</b> ${esc(g.send)}</p>`;
};
