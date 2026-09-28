import type { SerpSummary, YtSerp } from '../types';
import { domainOf } from '../util';

// Turn raw DataForSEO results into the small summaries the engine scores.

export function parseOrganic(keyword: string, result: any, evidence: string): SerpSummary {
  const items: any[] = result?.items || [];
  const organic = items.filter(i => i.type === 'organic').slice(0, 20).map(i => ({ rank: i.rank_group, domain: (i.domain || domainOf(i.url) || '').replace(/^www\./, ''), url: i.url, title: i.title || '' }));
  const paidDomains = [...new Set(items.filter(i => i.type === 'paid').map(i => (i.domain || domainOf(i.url) || '').replace(/^www\./, '')).filter(Boolean))];
  const local: SerpSummary['local'] = [];
  for (const lp of items.filter(i => i.type === 'local_pack')) local.push({ rank: lp.rank_group, title: lp.title || '', domain: lp.domain ? String(lp.domain).replace(/^www\./, '') : domainOf(lp.url) });
  const videoEls = items.filter(i => i.type === 'video');
  const videoItems = videoEls.flatMap(v => (v.items || []).map((x: any) => ({ title: x.title || '', url: x.url || '', domain: domainOf(x.url) || x.source || '' }))).slice(0, 10);
  const ai = items.find(i => i.type === 'ai_overview');
  const refDomains = ai ? [...new Set<string>([...(ai.references || []), ...((ai.items || []).flatMap((x: any) => x.references || []))].map((r: any) => (r.domain || domainOf(r.url) || '').replace(/^www\./, '')).filter(Boolean))] : [];
  const aiText = ai ? [ai.text, ai.markdown, ...(ai.items || []).map((x: any) => x.text || x.markdown)].filter(Boolean).join('\n').slice(0, 4000) : undefined;
  return { keyword, organic, paidDomains, local, videoRow: videoEls.length > 0, videoItems, aiOverview: { present: !!ai, refDomains, text: aiText }, evidence };
}

export function parseMapsTop3(result: any) {
  return (result?.items || []).filter((i: any) => i.type === 'maps_search').sort((a: any, b: any) => a.rank_group - b.rank_group).slice(0, 3)
    .map((i: any) => ({ title: i.title || '', domain: i.domain ? String(i.domain).replace(/^www\./, '') : domainOf(i.url), placeId: i.place_id || undefined }));
}

export function parseYoutube(keyword: string, result: any, evidence: string): YtSerp {
  const videos = (result?.items || []).filter((i: any) => i.type === 'youtube_video').slice(0, 20).map((i: any) => ({
    rank: i.rank_group, title: i.title || '', channel: i.channel_name || '', channelUrl: i.channel_url, views: i.views_count ?? null, url: i.url, isShorts: !!i.is_shorts, published: i.publication_date || i.timestamp,
  }));
  return { keyword, videos, evidence };
}

/** Keep raw evidence small: just the parts the engine read. */
export function trimOrganic(result: any) {
  return { keyword: result?.keyword, check_url: result?.check_url, datetime: result?.datetime, item_types: result?.item_types,
    items: (result?.items || []).filter((i: any) => ['organic', 'paid', 'local_pack', 'video', 'ai_overview'].includes(i.type)).slice(0, 40)
      .map((i: any) => ({ type: i.type, rank_group: i.rank_group, domain: i.domain, url: i.url, title: i.title, items: i.items?.slice?.(0, 10)?.map((x: any) => ({ title: x.title, url: x.url, text: x.text?.slice?.(0, 500), references: x.references })), references: i.references })) };
}
export function trimMaps(result: any) {
  return { keyword: result?.keyword, check_url: result?.check_url, datetime: result?.datetime, items: (result?.items || []).slice(0, 10).map((i: any) => ({ rank_group: i.rank_group, title: i.title, domain: i.domain, place_id: i.place_id, rating: i.rating })) };
}
export function trimYoutube(result: any) {
  return { keyword: result?.keyword, check_url: result?.check_url, datetime: result?.datetime, items: (result?.items || []).filter((i: any) => i.type === 'youtube_video').slice(0, 20).map((i: any) => ({ rank_group: i.rank_group, title: i.title, url: i.url, channel_name: i.channel_name, channel_url: i.channel_url, views_count: i.views_count, is_shorts: i.is_shorts, publication_date: i.publication_date })) };
}
