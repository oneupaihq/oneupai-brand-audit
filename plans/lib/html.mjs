// Small HTML helpers shared by the page builders.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// JSON that is safe inside a <script> element
export const scriptJson = v => JSON.stringify(v).replace(/</g, '\\u003c');

export const table = (head, rows, cls = '') =>
  `<div class="tw"><table class="${cls}"><thead><tr>${head.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>`
  + rows.map(r => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')
  + '</tbody></table></div>';

export const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap">';

export const KIND = { video: 'Video', short: 'Shorts', article: 'Article', note: 'Note', post: 'Post', setup: 'Setup', report: 'Report' };

// Optional client theme from plan.json "theme": the client's font and accent colour on every page.
// { font, accent (fills: bars, ticks, buttons), accentInk (text-safe accent), onAccent (text on accent), navy (headings), hero: [from, mid, to] }
export function themeHead(theme) {
  if (!theme) return { link: FONTS, css: '' };
  const fam = encodeURIComponent(theme.font).replace(/%20/g, '+');
  const link = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fam}:wght@400;500;600;700;800&display=swap">`;
  const t = { onAccent: '#1d2430', ...theme };
  const css = `
:root { --gold: ${t.accentInk}; --goldfill: ${t.accent};${t.navy ? ` --navy: ${t.navy};` : ''} }
body, button, input { font-family: "${t.font}", "Helvetica Neue", Arial, sans-serif; }
${t.hero ? `.hero { background: linear-gradient(160deg, ${t.hero.join(', ')}); }` : ''}
.btn.gold, #play { background: ${t.accent}; border-color: ${t.accent}; color: ${t.onAccent}; }
.kpi.pos { background: color-mix(in srgb, ${t.accent} 10%, #fff); border-color: color-mix(in srgb, ${t.accent} 40%, #fff); }
.facts li, .floop { border-left-color: ${t.accent}; }
.phase.hot { box-shadow: 0 0 0 2px ${t.accent} inset; }
`;
  return { link, css };
}
