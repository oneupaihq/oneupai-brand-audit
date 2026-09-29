import { q, one } from './db';

// Report view tracking: when a shared report is opened, what the viewer looks at and clicks, and
// how long they actively spend. No cookies and no IP addresses are stored: a random id in the
// viewer's browser tells repeat visits apart, and location is the city Vercel derives from the
// request. Previews by a signed-in user are never tracked.

export type TrackPage = '3d' | 'report';

const MAX_EVENTS_PER_VIEW = 400;
const KINDS = new Set(['open', 'stop', 'section', 'click', 'plan', 'link']);

/** The snippet both report pages include. Pages call window.__track(kind, label) for events. */
export function trackingScript(slug: string, page: TrackPage) {
  const cfg = JSON.stringify({ s: slug, p: page }).replace(/</g, '\\u003c');
  return `<script>(function(){
var C=${cfg},E='/api/track',q=[],act=0,last=Date.now(),seen=Date.now(),vis=!document.hidden,sc=0,v,u;
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,10)}
v=id();try{u=localStorage.getItem('oa_vis');if(!u){u=id();localStorage.setItem('oa_vis',u)}}catch(e){u=null}
function tick(){var n=Date.now();if(vis&&n-seen<120000)act+=n-last;last=n}
function send(end){tick();var b=JSON.stringify({s:C.s,p:C.p,v:v,u:u,a:Math.round(act),sc:sc,r:document.referrer||'',e:q.splice(0,50),end:!!end});
try{if(navigator.sendBeacon&&navigator.sendBeacon(E,new Blob([b],{type:'text/plain'})))return}catch(e){}
try{fetch(E,{method:'POST',body:b,keepalive:true,headers:{'Content-Type':'text/plain'}})}catch(e){}}
window.__track=function(k,l){q.push({k:k,l:String(l==null?'':l).slice(0,140)});if(q.length>=12)send()};
['pointerdown','keydown','wheel','touchstart','mousemove','scroll'].forEach(function(t){addEventListener(t,function(){tick();seen=Date.now()},{passive:true})});
addEventListener('scroll',function(){var h=document.documentElement,m=h.scrollHeight-innerHeight;if(m>0)sc=Math.max(sc,Math.round(100*scrollY/m))},{passive:true});
document.addEventListener('visibilitychange',function(){tick();vis=!document.hidden;if(!vis)send(true)});
addEventListener('pagehide',function(){send(true)});
setInterval(function(){if(vis)send()},15000);
if(C.p==='report'){var done={};try{var io=new IntersectionObserver(function(es){es.forEach(function(x){var k=x.target.getAttribute('data-track');if(x.isIntersecting&&!done[k]){done[k]=1;__track('section',k)}})},{threshold:.35});document.querySelectorAll('section[data-track]').forEach(function(s){io.observe(s)})}catch(e){}
document.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('a');if(a)__track('link',a.getAttribute('data-track')||a.textContent.trim().slice(0,80))},true)}
__track('open',C.p);send();
})();</script>`;
}

function parseUa(ua: string) {
  const device = /iPad|Tablet/i.test(ua) ? 'Tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'Phone' : 'Computer';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  return { device, browser: [browser, os].filter(Boolean).join(' on ') };
}
const dec = (s: string | null) => { if (!s) return null; try { return decodeURIComponent(s).slice(0, 80); } catch { return s.slice(0, 80); } };
const refHost = (r: string) => { try { return r ? new URL(r).hostname.slice(0, 80) : null; } catch { return null; } };

/** Records one beacon. Only published, unexpired reports are tracked. */
export async function recordBeacon(raw: string, headers: Headers): Promise<boolean> {
  if (raw.length > 20000) return false;
  let b: any;
  try { b = JSON.parse(raw); } catch { return false; }
  const viewId = String(b?.v || '').slice(0, 40), slug = String(b?.s || '').slice(0, 80);
  const page: TrackPage = b?.p === 'report' ? 'report' : '3d';
  if (!/^[a-z0-9]{8,40}$/i.test(viewId) || !slug) return false;
  const ua = headers.get('user-agent') || '';
  if (/bot|crawl|spider|preview|headless|facebookexternalhit|slackbot|whatsapp/i.test(ua)) return false;
  const a = await one<{ id: string; status: string; expires_at: string | null }>('select id, status, expires_at from audits where slug = $1', [slug]);
  if (!a || a.status !== 'published' || (a.expires_at && new Date(a.expires_at) < new Date())) return false;

  const activeMs = Math.max(0, Math.min(Number(b.a) || 0, 6 * 3600_000));
  const scroll = Math.max(0, Math.min(Number(b.sc) || 0, 100));
  const existing = await one<{ audit_id: string; events: number }>('select audit_id, events from report_views where id = $1', [viewId]);
  if (existing && existing.audit_id !== a.id) return false;
  if (!existing) {
    const { device, browser } = parseUa(ua);
    await q(`insert into report_views (id, audit_id, page, visitor, device, browser, country, region, city, referrer)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (id) do nothing`,
      [viewId, a.id, page, b.u ? String(b.u).slice(0, 40) : null, device, browser, dec(headers.get('x-vercel-ip-country')), dec(headers.get('x-vercel-ip-country-region')), dec(headers.get('x-vercel-ip-city')), refHost(String(b.r || ''))]);
  }
  const room = MAX_EVENTS_PER_VIEW - (existing?.events || 0);
  const events = (Array.isArray(b.e) ? b.e : []).filter((e: any) => KINDS.has(e?.k)).slice(0, Math.max(0, Math.min(50, room)));
  for (const e of events) await q('insert into report_events (view_id, audit_id, kind, label) values ($1,$2,$3,$4)', [viewId, a.id, e.k, String(e.l ?? '').slice(0, 140)]);
  await q('update report_views set last_at = now(), active_ms = greatest(active_ms, $2), max_scroll = greatest(max_scroll, $3), events = events + $4 where id = $1', [viewId, activeMs, scroll, events.length]);
  return true;
}

export interface ViewRow {
  id: string; page: TrackPage; started_at: string; last_at: string; active_ms: number; max_scroll: number;
  visitor: string | null; device: string | null; browser: string | null; country: string | null; region: string | null; city: string | null; referrer: string | null;
  events: { kind: string; label: string | null; at: string }[];
}

export async function viewsFor(auditId: string): Promise<ViewRow[]> {
  const views = await q<ViewRow>('select * from report_views where audit_id = $1 order by started_at desc limit 100', [auditId]);
  if (!views.length) return [];
  const evs = await q<{ view_id: string; kind: string; label: string | null; at: string }>(
    'select view_id, kind, label, at from report_events where audit_id = $1 and kind <> $2 order by id', [auditId, 'open']);
  const by = new Map<string, ViewRow['events']>();
  for (const e of evs) { if (!by.has(e.view_id)) by.set(e.view_id, []); by.get(e.view_id)!.push({ kind: e.kind, label: e.label, at: e.at }); }
  return views.map(v => ({ ...v, events: by.get(v.id) || [] }));
}
