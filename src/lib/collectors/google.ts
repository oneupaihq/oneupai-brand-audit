import { env } from '../env';
import type { Place, YoutubeSummary } from '../types';
import { domainOf } from '../util';

// Google Places API (New), PageSpeed Insights and YouTube Data API v3, all with one API key.

const PLACE_FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'websiteUri', 'nationalPhoneNumber', 'googleMapsUri', 'primaryTypeDisplayName', 'photos', 'regularOpeningHours', 'editorialSummary', 'businessStatus'];

function toPlace(p: any): Place {
  return {
    placeId: p.id,
    name: p.displayName?.text || '',
    address: p.formattedAddress,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    website: p.websiteUri,
    phone: p.nationalPhoneNumber,
    rating: p.rating ?? null,
    reviews: p.userRatingCount ?? 0,
    mapsUrl: p.googleMapsUri,
    category: p.primaryTypeDisplayName?.text,
    photos: Array.isArray(p.photos) ? p.photos.length : 0,
    hasHours: !!p.regularOpeningHours,
    description: p.editorialSummary?.text,
  };
}

export async function placesSearch(text: string, bias?: { lat: number; lng: number; radius?: number }, max = 10): Promise<{ places: Place[]; raw: any }> {
  const body: any = { textQuery: text, maxResultCount: max };
  if (bias) body.locationBias = { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: bias.radius ?? 30000 } };
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.googleKey, 'X-Goog-FieldMask': PLACE_FIELDS.map(f => 'places.' + f).join(',') },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Places search: ${j.error?.message || res.status}`);
  const trimmed = (j.places || []).map((p: any) => ({ ...p, photos: Array.isArray(p.photos) ? p.photos.length : 0 }));
  return { places: (j.places || []).map(toPlace), raw: { places: trimmed } };
}

export async function placeDetails(placeId: string): Promise<{ place: Place; raw: any }> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': env.googleKey, 'X-Goog-FieldMask': PLACE_FIELDS.join(',') },
    signal: AbortSignal.timeout(30_000),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Place details: ${j.error?.message || res.status}`);
  return { place: toPlace(j), raw: { ...j, photos: Array.isArray(j.photos) ? j.photos.length : 0 } };
}

export async function geocode(market: string) {
  const { places, raw } = await placesSearch(market, undefined, 1);
  const p = places[0];
  if (!p?.lat || !p?.lng) throw new Error(`Could not find the market "${market}" on Google Maps`);
  return { lat: p.lat, lng: p.lng, label: p.address || market, raw };
}

export async function pageSpeed(url: string) {
  const u = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  u.searchParams.set('url', url);
  u.searchParams.set('strategy', 'mobile');
  u.searchParams.append('category', 'performance');
  u.searchParams.append('category', 'seo');
  u.searchParams.set('key', env.googleKey);
  const res = await fetch(u, { signal: AbortSignal.timeout(90_000) });
  const j = await res.json();
  if (!res.ok) throw new Error(`PageSpeed: ${j.error?.message || res.status}`);
  const c = j.lighthouseResult?.categories || {};
  const perf = c.performance?.score, seo = c.seo?.score;
  return {
    performance: perf == null ? null : Math.round(perf * 100),
    seo: seo == null ? null : Math.round(seo * 100),
    raw: { finalUrl: j.lighthouseResult?.finalUrl, performance: perf, seo, lcp: j.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue },
  };
}

// ---------- YouTube ----------

async function yt(path: string, params: Record<string, string>) {
  const u = new URL('https://www.googleapis.com/youtube/v3/' + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('key', env.googleKey);
  const res = await fetch(u, { signal: AbortSignal.timeout(30_000) });
  const j = await res.json();
  if (!res.ok) throw new Error(`YouTube ${path}: ${j.error?.message || res.status}`);
  return j;
}

/** Resolve a channel from a URL (/channel/ID, /@handle, /c/name, /user/name) or a search by name. */
export async function findChannelId(urlOrName: string, searchName?: string): Promise<string | null> {
  const m = urlOrName.match(/youtube\.com\/(channel\/([\w-]+)|@([\w.-]+)|c\/([\w.-]+)|user\/([\w.-]+))/i);
  if (m?.[2]) return m[2];
  if (m?.[3]) { const j = await yt('channels', { part: 'id', forHandle: '@' + m[3] }); if (j.items?.[0]?.id) return j.items[0].id; }
  if (m?.[5]) { const j = await yt('channels', { part: 'id', forUsername: m[5] }); if (j.items?.[0]?.id) return j.items[0].id; }
  const name = searchName || m?.[4];
  if (!name) return null;
  const j = await yt('search', { part: 'snippet', type: 'channel', q: name, maxResults: '3' });
  return j.items?.[0]?.snippet?.channelId || null;
}

export async function channelSummary(channelId: string): Promise<{ summary: Omit<YoutubeSummary, 'evidence'>; raw: any }> {
  const c = await yt('channels', { part: 'snippet,statistics,contentDetails', id: channelId });
  const ch = c.items?.[0];
  if (!ch) throw new Error('Channel not found');
  const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
  const since = new Date(); since.setMonth(since.getMonth() - 12);
  const perMonth = new Array(12).fill(0);
  const recent: { id: string; title: string; at: string }[] = [];
  let pageToken = '';
  for (let page = 0; uploads && page < 4; page++) {
    const p = await yt('playlistItems', { part: 'snippet,contentDetails', playlistId: uploads, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
    let older = false;
    for (const it of p.items || []) {
      const at = it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt;
      if (!at) continue;
      const d = new Date(at);
      if (d < since) { older = true; continue; }
      const monthsAgo = (new Date().getFullYear() - d.getFullYear()) * 12 + (new Date().getMonth() - d.getMonth());
      if (monthsAgo >= 0 && monthsAgo < 12) perMonth[11 - monthsAgo]++;
      recent.push({ id: it.contentDetails?.videoId, title: it.snippet?.title, at });
    }
    pageToken = p.nextPageToken;
    if (older || !pageToken) break;
  }
  let views12: number | null = 0;
  for (let i = 0; i < Math.min(recent.length, 150); i += 50) {
    const v = await yt('videos', { part: 'statistics', id: recent.slice(i, i + 50).map(r => r.id).join(',') });
    for (const it of v.items || []) views12 += Number(it.statistics?.viewCount || 0);
  }
  if (!recent.length) views12 = 0;
  const s = ch.statistics || {};
  const summary = {
    channelId, title: ch.snippet?.title || '',
    subscribers: s.hiddenSubscriberCount ? null : Number(s.subscriberCount ?? 0),
    videos: Number(s.videoCount ?? 0), uploads12: perMonth, views12, recentTitles: recent.slice(0, 10).map(r => r.title), recentIds: recent.map(r => r.id).filter(Boolean),
  };
  return { summary, raw: { channel: { id: ch.id, title: summary.title, statistics: s }, recent: recent.slice(0, 60) } };
}

export function channelFromSite(links: Record<string, string | undefined>) {
  return links.youtube && /youtube\.com/i.test(links.youtube) ? links.youtube : undefined;
}

export { domainOf };
