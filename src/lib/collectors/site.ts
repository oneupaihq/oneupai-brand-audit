import { parse, HTMLElement } from 'node-html-parser';
import type { SiteSummary, SocialKey } from '../types';
import { domainOf, normUrl, sameSite } from '../util';

// Reads a business website directly: pages, structure, local signals, social links and logo.

const UA = 'Mozilla/5.0 (compatible; OneUpAI-Audit/1.0; +https://audit.oneupai.com)';
const PRIORITY = /(service|about|faq|contact|review|testimonial|portfolio|project|gallery|listing|area|neighborhood|location|kitchen|bath|remodel|yacht|boat|home|sell|buy|lawn|landscap)/i;

async function get(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.includes('html')) throw new Error(`${res.status} ${type}`);
  return { html: (await res.text()).slice(0, 1_500_000), url: res.url };
}

function visibleText(root: HTMLElement) {
  const clone = parse(root.toString());
  clone.querySelectorAll('script,style,noscript,svg,iframe,template').forEach(n => n.remove());
  return clone.structuredText.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

const SOCIAL: [SocialKey | 'youtube', RegExp][] = [
  ['instagram', /instagram\.com\/(?!p\/|reel\/|explore)[\w.]+/i],
  ['tiktok', /tiktok\.com\/@[\w.]+/i],
  ['facebook', /facebook\.com\/(?!sharer|share|dialog|plugins|tr\b)[\w.-]+/i],
  ['linkedin', /linkedin\.com\/(company|in)\/[\w-]+/i],
  ['youtube', /youtube\.com\/(channel\/|@|c\/|user\/)[\w.-]+/i],
];

export async function crawlSite(website: string, city: string, maxPages = 8): Promise<{ summary: Omit<SiteSummary, 'evidence'>; raw: any }> {
  const start = normUrl(website);
  const pages: SiteSummary['pages'] = [];
  const schema = new Set<string>();
  const social: SiteSummary['socialLinks'] = {};
  let hasPhoneLink = false, hasFaq = false, videoEmbeds = 0, spanish = false, logoUrl: string | undefined;
  let text = '';
  let home: { html: string; url: string };
  try { home = await get(start); } catch (e: any) {
    return { summary: { url: start, ok: false, pages: [], hasPhoneLink: false, hasSchemaLocalBusiness: false, schemaTypes: [], hasFaq: false, videoEmbeds: 0, mentionsCity: false, spanish: false, socialLinks: {}, text: '' }, raw: { error: String(e?.message || e) } };
  }
  const host = domainOf(home.url);
  const queue: string[] = [];
  const seen = new Set<string>([home.url.replace(/#.*$/, '')]);

  const read = (html: string, url: string, isHome: boolean) => {
    const root = parse(html);
    const title = root.querySelector('title')?.text.trim() || '';
    const h1 = root.querySelector('h1')?.text.replace(/\s+/g, ' ').trim() || '';
    const t = visibleText(root);
    pages.push({ url, title, h1, words: t.split(/\s+/).filter(Boolean).length });
    if (text.length < 14000) text += `\n\n[${url}]\n` + t.slice(0, 5000);
    if (root.querySelector('a[href^="tel:"]')) hasPhoneLink = true;
    if (/lang=["']es/i.test(html) || /\/es\//.test(html) || /\b(Español|español|Hablamos)\b/.test(html)) spanish = true;
    for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const j = JSON.parse(s.text);
        const walk = (o: any) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk); const ty = o['@type']; (Array.isArray(ty) ? ty : [ty]).filter(Boolean).forEach((x: string) => schema.add(String(x))); if (o['@graph']) walk(o['@graph']); };
        walk(j);
      } catch { /* ignore bad JSON-LD */ }
    }
    if (schema.has('FAQPage') || /\b(FAQ|Frequently Asked Questions)\b/i.test(t.slice(0, 20000))) hasFaq = true;
    videoEmbeds += root.querySelectorAll('iframe[src*="youtube"],iframe[src*="vimeo"],video,iframe[src*="wistia"]').length;
    for (const a of root.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') || '';
      for (const [k, re] of SOCIAL) { const m = href.match(re); if (m && !social[k]) social[k] = 'https://' + m[0].replace(/^https?:\/\//, ''); }
      if (isHome) {
        try {
          const u = new URL(href, url); u.hash = '';
          if (sameSite(domainOf(u.toString()), host) && !seen.has(u.toString()) && !/\.(pdf|jpg|jpeg|png|gif|webp|zip|mp4)$/i.test(u.pathname)) { seen.add(u.toString()); queue.push(u.toString()); }
        } catch { /* skip */ }
      }
    }
    if (isHome) {
      const icon = root.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')
        || root.querySelector('img[class*="logo" i],img[id*="logo" i],img[alt*="logo" i],img[src*="logo" i]')?.getAttribute('src')
        || root.querySelector('meta[property="og:image"]')?.getAttribute('content')
        || root.querySelector('link[rel~="icon"]')?.getAttribute('href');
      if (icon) try { logoUrl = new URL(icon, url).toString(); } catch { /* skip */ }
    }
  };

  read(home.html, home.url, true);
  const next = [...queue.filter(u => PRIORITY.test(u)), ...queue.filter(u => !PRIORITY.test(u))].slice(0, maxPages - 1);
  await Promise.all(next.map(async u => { try { const p = await get(u); read(p.html, p.url, false); } catch { /* skip page */ } }));

  const cityRe = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const localTypes = [...schema].filter(t => /LocalBusiness|RealEstateAgent|HomeAndConstructionBusiness|GeneralContractor|Organization|ProfessionalService|AutoDealer|Store/i.test(t));
  const summary = {
    url: home.url, ok: true, pages, hasPhoneLink, hasSchemaLocalBusiness: localTypes.length > 0, schemaTypes: [...schema].slice(0, 20),
    hasFaq, videoEmbeds, mentionsCity: cityRe.test(text), spanish, socialLinks: social, logoUrl, text: text.trim().slice(0, 14000),
  };
  return { summary, raw: { pages, schemaTypes: summary.schemaTypes, socialLinks: social, hasPhoneLink, hasFaq, videoEmbeds, spanish, logoUrl } };
}

/** Download a logo and return it as a data URL (so the 3D page can draw it without cross-site requests). */
export async function logoDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15_000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !/^image\/(png|jpe?g|webp|gif|svg\+xml)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 400_000 || buf.length < 200) return null;
    return `data:${type.split(';')[0]};base64,${buf.toString('base64')}`;
  } catch { return null; }
}
