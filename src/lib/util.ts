import { randomBytes } from 'crypto';

export const newId = (prefix = '') => prefix + randomBytes(9).toString('base64url');

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

export function domainOf(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch { return undefined; }
}

export function normUrl(url: string) {
  const d = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
  try { return new URL(d).toString(); } catch { return d; }
}

/** Registrable domain match: "shop.acme.com" matches "acme.com". */
export function sameSite(a?: string, b?: string) {
  if (!a || !b) return false;
  return a === b || a.endsWith('.' + b) || b.endsWith('.' + a);
}

const STOP = new Set(['the', 'and', 'of', 'inc', 'llc', 'co', 'company', 'group', 'team', 'services', 'service', 'pa', 'corp', 'ltd', 'a', 'at', 'by', 'realty', 'real', 'estate', 'yachts', 'yacht', 'remodeling', 'construction', 'landscaping', 'florida', 'fl', 'ca', 'california']);

export function normName(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Distinctive words of a business name, used when the full name is not written out. */
export function nameTokens(s: string) {
  return normName(s).split(' ').filter(w => w.length > 2 && !STOP.has(w));
}

/** True if `text` names the business: full name, or all its distinctive words together, or its domain. */
export function textNames(text: string, name: string, domain?: string) {
  const t = ' ' + normName(text) + ' ';
  const n = normName(name);
  if (n.length >= 4 && t.includes(' ' + n + ' ')) return true;
  const toks = nameTokens(name);
  if (toks.length >= 2 && toks.every(k => t.includes(' ' + k + ' '))) return true;
  if (domain) {
    const stem = domain.split('.')[0];
    if (text.toLowerCase().includes(domain)) return true;
    if (stem.length >= 6 && t.includes(' ' + stem + ' ')) return true;
  }
  return false;
}

export function median(vals: number[]): number | null {
  const v = vals.filter(x => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
export const round = (v: number, d = 0) => { const k = 10 ** d; return Math.round(v * k) / k; };

/** Seeded random numbers, used only to generate sample data. */
export function rng(seedText: string) {
  let h = 2166136261;
  for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  let s = (h >>> 0) || 1;
  return () => { s = (Math.imul(s, 48271) % 2147483647 + 2147483647) % 2147483647; return s / 2147483647; };
}

export async function pool<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function cityOf(market: string) { return market.split(',')[0].trim(); }

export function fmtNum(n: number | null | undefined) {
  if (n == null) return 'not checked';
  return n.toLocaleString('en-US');
}

export function initials(name: string) {
  const w = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase();
}
