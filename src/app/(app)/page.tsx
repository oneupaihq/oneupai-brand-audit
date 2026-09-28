import Link from 'next/link';
import { connection } from 'next/server';
import { listAudits } from '@/lib/audits';
import { INDUSTRIES } from '@/lib/industries';
import { STATUS_LABEL } from '@/lib/labels';

export default async function Home() {
  await connection();
  let audits: Awaited<ReturnType<typeof listAudits>> = [];
  let dbError = '';
  try { audits = await listAudits(); } catch (e: any) { dbError = e.message; }
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Audits</h1>
          <p className="muted small" style={{ margin: 0 }}>Every prospect and client audit, newest first.</p>
        </div>
        <Link href="/audits/new" className="btn gold">New audit</Link>
      </div>
      {dbError && <div className="banner warn"><b>Database not connected.</b> {dbError}</div>}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Business</th><th>Industry</th><th>Market</th><th>Type</th><th>Status</th><th>Outcome</th><th>Started</th></tr></thead>
          <tbody>
            {audits.length === 0 && <tr><td colSpan={7} className="muted" style={{ padding: 20 }}>No audits yet. Start one with <b>New audit</b>.</td></tr>}
            {audits.map(a => (
              <tr key={a.id}>
                <td><Link href={`/audits/${a.id}`}><b>{a.name}</b></Link>{a.parent_id && <span className="chip" style={{ marginLeft: 6 }}>monthly re-run</span>}{a.sample && <span className="chip sample" style={{ marginLeft: 6 }}>sample</span>}</td>
                <td>{INDUSTRIES[a.industry as keyof typeof INDUSTRIES]?.label || a.industry}</td>
                <td>{a.market}</td>
                <td>{a.tier === 'quick' ? 'Quick' : 'Full'}</td>
                <td><span className={`chip ${a.status}`}>{STATUS_LABEL[a.status]}</span></td>
                <td>{a.outcome ? a.outcome.replace('_', ' ') : <span className="muted">-</span>}</td>
                <td className="small muted">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
