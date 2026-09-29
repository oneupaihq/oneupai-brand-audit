import { viewsFor, type ViewRow } from '@/lib/tracking';

// Who opened the shared links, what they looked at and for how long.

const TZ = process.env.APP_TIMEZONE || 'America/New_York';
const when = (s: string) => new Date(s).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dur = (ms: number) => { const s = Math.round(ms / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
const SECTION: Record<string, string> = { current: 'Current State', reputation: 'Reputation', searches: 'What customers search', website: 'Website', platforms: 'Platforms', gaps: 'Gaps', plan: '90-day plan', measurement: 'Measurement', about: 'About' };

function describe(e: ViewRow['events'][number]) {
  switch (e.kind) {
    case 'stop': return `Went to stop: ${e.label}`;
    case 'section': return `Read: ${SECTION[e.label || ''] || e.label}`;
    case 'click': return `Opened: ${e.label}`;
    case 'plan': return `Turned the 90-day plan ${e.label}`;
    case 'link': return `Clicked: ${e.label}`;
    default: return `${e.kind}: ${e.label}`;
  }
}

const pl = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function summary(v: ViewRow) {
  const n = (k: string) => new Set(v.events.filter(e => e.kind === k).map(e => e.label)).size;
  const parts = v.page === '3d'
    ? [pl(n('stop'), 'stop'), pl(v.events.filter(e => e.kind === 'click').length, 'click'), v.events.some(e => e.kind === 'plan' && e.label === 'on') ? 'turned the plan on' : '']
    : [`${n('section')} of 9 sections`, `scrolled ${v.max_scroll}%`, v.events.some(e => e.kind === 'link') ? pl(v.events.filter(e => e.kind === 'link').length, 'link') : ''];
  return parts.filter(Boolean).join(' · ');
}

export default async function ReportViews({ auditId }: { auditId: string }) {
  const views = await viewsFor(auditId);
  const visitors = new Set(views.map(v => v.visitor || v.id)).size;
  const total = views.reduce((s, v) => s + v.active_ms, 0);
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <h2>Views</h2>
      {views.length === 0 ? (
        <p className="muted small">No one has opened the shared links yet. Opens, clicks and time spent show up here within about 15 seconds. Your own previews while signed in are not counted.</p>
      ) : (
        <>
          <p className="small"><b>{views.length}</b> opens by <b>{visitors}</b> {visitors === 1 ? 'device' : 'devices'} · <b>{dur(total)}</b> active in total · last opened <b>{when(views[0].last_at)}</b></p>
          <table>
            <thead><tr><th>When</th><th>What</th><th>Device</th><th>Where</th><th className="num">Active time</th><th>What they did</th></tr></thead>
            <tbody>
              {views.map(v => (
                <tr key={v.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{when(v.started_at)}</td>
                  <td>{v.page === '3d' ? '3D view' : 'Written report'}</td>
                  <td className="small">{v.device}<br />{v.browser}</td>
                  <td className="small">{[v.city, v.region, v.country].filter(Boolean).join(', ') || '-'}{v.referrer ? <><br />from {v.referrer}</> : null}</td>
                  <td className="num">{dur(v.active_ms)}</td>
                  <td className="small">
                    {v.events.length ? (
                      <details><summary>{summary(v)}</summary><ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>{v.events.map((e, i) => <li key={i}>{describe(e)}</li>)}</ol></details>
                    ) : summary(v) || 'Opened only'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">Active time counts only while the page is on screen and in use. Location is approximate (from the network). A device is one browser; the same person on a phone and a laptop counts twice.</p>
        </>
      )}
    </div>
  );
}
