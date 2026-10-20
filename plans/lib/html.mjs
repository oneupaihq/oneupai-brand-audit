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
