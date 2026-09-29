import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getAudit, identities } from '@/lib/audits';
import { q } from '@/lib/db';
import { env } from '@/lib/env';
import { INDUSTRIES } from '@/lib/industries';
import { KIND_LABEL, PHASE_LABEL, STATUS_LABEL } from '@/lib/labels';
import { STEP_LABELS } from '@/lib/engine/steps';
import type { BrandId, SocialKey } from '@/lib/types';
import { confirmCompetitors, publish, reanalyze, retry, saveSocial, setAnonymize, setFinding, setOutcome, unpublish } from '@/app/actions';
import AutoRefresh from './refresh';
import CopyButton from './copy';
import ReportViews from './views';

const ORDER = ['resolve', 'keywords', 'serp_post', 'serp_collect', 'assistants', 'profiles', 'content', 'analyze'];
const cls = (s: number | null | undefined) => (s == null ? 'muted' : s >= 80 ? 's-good' : s >= 40 ? 's-mid' : 's-bad');
const PLATS: SocialKey[] = ['instagram', 'tiktok', 'facebook', 'linkedin'];
const PNAME: Record<SocialKey, string> = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', linkedin: 'LinkedIn' };

export default async function AuditPage(props: PageProps<'/audits/[id]'>) {
  await connection();
  const { id } = await props.params;
  const a = await getAudit(id);
  if (!a) notFound();
  const logs = await q<{ at: string; level: string; message: string }>('select at, level, message from audit_log where audit_id = $1 order by id desc limit 40', [id]);
  const ind = INDUSTRIES[a.inputs.industry];
  const r = a.results;
  const ids = identities(a).filter(i => a.data.brands[i.id]);
  const active = a.status === 'running';
  const reportUrl = `${env.reportBaseUrl}/r/${a.slug}`;
  const hidden = new Set(a.overrides?.hiddenFindings || []);
  const stepIdx = a.step ? ORDER.indexOf(a.step) : ORDER.length;

  return (
    <>
      <AutoRefresh on={active} />
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h1>{a.name}</h1>
          <div className="row small muted">
            <span>{ind.label}</span>·<span>{a.market}</span>·<a href={a.website} target="_blank" rel="noreferrer">{a.website.replace(/^https?:\/\//, '')}</a>·<span>{a.tier === 'quick' ? 'Quick audit' : 'Full audit'}</span>
            <span className={`chip ${a.status}`}>{STATUS_LABEL[a.status]}</span>
            {a.sample && <span className="chip sample">Sample data</span>}
            {a.parent_id && <Link href={`/audits/${a.parent_id}`} className="chip">Monthly re-run of the baseline</Link>}
          </div>
        </div>
        <div className="small muted" title="What DataForSEO reported charging for this audit">Data cost so far: ${Number(a.cost || 0).toFixed(2)}</div>
      </div>

      {a.status === 'failed' && (
        <div className="banner warn">
          <b>The audit stopped at &quot;{STEP_LABELS[a.step || ''] || a.step}&quot;.</b> {a.error}
          <form action={retry} style={{ marginTop: 8 }}><input type="hidden" name="id" value={a.id} /><button className="btn small">Retry from this step</button></form>
        </div>
      )}

      {(a.status === 'running' || a.status === 'awaiting_competitors' || a.status === 'failed') && (
        <div className="grid2">
          <div className="card">
            <h2>Progress</h2>
            <ul className="steps">
              {ORDER.filter(s => a.tier === 'full' || s !== 'content').map((s, i) => (
                <li key={s} className={i < stepIdx ? 'done' : s === a.step && a.status === 'running' ? 'now' : ''}>{STEP_LABELS[s]}{s === 'keywords' && a.status === 'awaiting_competitors' ? ' (waiting for you to confirm competitors)' : ''}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2>Activity</h2>
            <div className="log">{logs.map((l, i) => <div key={i} className={l.level}>{new Date(l.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}  {l.message}</div>)}</div>
          </div>
        </div>
      )}

      {a.status === 'awaiting_competitors' && a.competitors && (
        <form action={confirmCompetitors} className="card">
          <input type="hidden" name="id" value={a.id} />
          <h2>Confirm the Google profile and competitors</h2>
          <h3>Which Google profile is {a.name}&apos;s?</h3>
          {a.competitors.clientPlaceOptions.map((p, i) => (
            <label key={p.placeId} className="cand" style={{ fontWeight: 400 }}>
              <input type="radio" name="clientPlace" value={p.placeId} defaultChecked={a.competitors!.clientPlace ? p.placeId === a.competitors!.clientPlace.placeId : i === 0} />
              <span><b>{p.name}</b> <span className="muted small">{p.address} · {p.reviews ?? 0} reviews{p.website ? ` · ${p.website.replace(/^https?:\/\//, '').slice(0, 40)}` : ''}</span> {p.mapsUrl && <a href={p.mapsUrl} target="_blank" rel="noreferrer" className="small">open</a>}</span>
            </label>
          ))}
          <label className="cand" style={{ fontWeight: 400 }}><input type="radio" name="clientPlace" value="none" defaultChecked={!a.competitors.clientPlace && !a.competitors.clientPlaceOptions.length} /><span>None of these: the business has no Google profile</span></label>
          <h3 style={{ marginTop: 18 }}>Pick up to 3 competitors</h3>
          <p className="muted small">Suggested from the Google map and the top search results. The first 3 are pre-selected.</p>
          {a.competitors.candidates.map((c, i) => (
            <label key={c.key} className="cand" style={{ fontWeight: 400 }}>
              <input type="checkbox" name="cand" value={c.key} defaultChecked={i < 3} />
              <span><b>{c.name}</b> <span className="muted small">{c.domain || 'no website'}{c.place?.reviews != null ? ` · ${c.place.reviews} reviews` : ''} · {c.why}</span></span>
            </label>
          ))}
          <details style={{ margin: '10px 0 16px' }}><summary>Add a competitor by hand</summary>
            {[1, 2, 3].map(n => (
              <div key={n} className="row" style={{ marginTop: 8 }}>
                <input type="text" name={`addName${n}`} placeholder="Business name" style={{ flex: 1 }} />
                <input type="text" name={`addSite${n}`} placeholder="website.com" style={{ flex: 1 }} />
              </div>
            ))}
            <p className="hint">Only the first 3 competitors in total are used.</p>
          </details>
          <button className="btn gold">Confirm and continue</button>
        </form>
      )}

      {(a.status === 'review' || a.status === 'published' || (a.status === 'running' && a.competitors?.confirmed)) && (
        <details className="card" open={a.status === 'review' && !r?.scores.categories.find(c => c.key === 'social')?.checked}>
          <summary>Social check (entered by hand, about 10 minutes)</summary>
          <p className="muted small">Instagram, TikTok, Facebook and LinkedIn can&apos;t be read automatically. Open each public profile and enter followers, the last post date, and the number of posts in the last 90 days. Tick &quot;none&quot; if the business has no profile there. Leave blank to mark it not checked.</p>
          <form action={saveSocial}>
            <input type="hidden" name="id" value={a.id} />
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Business</th><th>Platform</th><th>Profile</th><th>Followers</th><th>Last post</th><th>Posts in 90 days</th><th>None</th></tr></thead>
                <tbody>
                  {ids.flatMap(idn => PLATS.map(p => {
                    const known = idn.id === 'client' ? a.inputs.social[p] || a.data.brands.client?.site?.socialLinks?.[p] : a.data.brands[idn.id]?.site?.socialLinks?.[p];
                    const e = a.manual?.[idn.id]?.[p];
                    const search = `https://www.google.com/search?q=${encodeURIComponent(`${idn.name} ${a.data.city || a.market} ${PNAME[p]}`)}`;
                    return (
                      <tr key={idn.id + p}>
                        <td>{p === 'instagram' ? <b>{idn.name}</b> : ''}</td>
                        <td>{PNAME[p]}</td>
                        <td className="small">{known ? <a href={known} target="_blank" rel="noreferrer">open</a> : <a href={search} target="_blank" rel="noreferrer">search</a>}</td>
                        <td><input type="number" min={0} name={`${idn.id}.${p}.followers`} defaultValue={e?.followers ?? ''} style={{ width: 110 }} /></td>
                        <td><input type="date" name={`${idn.id}.${p}.lastPost`} defaultValue={e?.lastPost ?? ''} /></td>
                        <td><input type="number" min={0} name={`${idn.id}.${p}.posts90`} defaultValue={e && e.posts90 != null && (e.followers || e.posts90) ? e.posts90 : ''} style={{ width: 90 }} /></td>
                        <td><input type="checkbox" name={`${idn.id}.${p}.none`} defaultChecked={!!e && !e.followers && !e.posts90 && !e.lastPost} /></td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
            <button className="btn" style={{ marginTop: 12 }}>Save social numbers</button>
          </form>
        </details>
      )}

      {r && (a.status === 'review' || a.status === 'published') && (
        <>
          {r.checks.thin.length > 0 && (
            <div className="banner warn"><b>Check before sharing</b><ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{r.checks.thin.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
          )}

          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>Share</h2>
              <div className="row">
                <Link className="btn ghost small" href={`/r/${a.slug}`} target="_blank">Preview 3D report</Link>
                <Link className="btn ghost small" href={`/r/${a.slug}/report`} target="_blank">Preview written report</Link>
                <Link className="btn ghost small" href={`/audits/${a.id}/brief`}>Strategy brief</Link>
              </div>
            </div>
            {a.status === 'published' ? (
              <div style={{ marginTop: 12 }}>
                <div className="row"><span className="small" style={{ width: 110 }}>3D view</span><div className="share" style={{ flex: 1 }}>{reportUrl}</div><CopyButton text={reportUrl} /></div>
                <div className="row" style={{ marginTop: 6 }}><span className="small" style={{ width: 110 }}>Written report</span><div className="share" style={{ flex: 1 }}>{reportUrl}/report</div><CopyButton text={`${reportUrl}/report`} /></div>
                <p className="small muted">Published {new Date(a.published_at!).toLocaleDateString()}. {a.expires_at ? `The link turns off on ${new Date(a.expires_at).toLocaleDateString()}.` : 'The link stays live (client).'}</p>
                <form action={unpublish}><input type="hidden" name="id" value={a.id} /><button className="btn ghost small">Turn off the link</button></form>
              </div>
            ) : (
              <div className="row" style={{ marginTop: 12 }}>
                <form action={setAnonymize} className="row">
                  <input type="hidden" name="id" value={a.id} />
                  <label style={{ fontWeight: 400, margin: 0 }}>3D scene{' '}
                    <select name="scene" defaultValue={r.report.scene || 'city'} style={{ width: 'auto', padding: '4px 8px' }}>
                      <option value="city">City: towers</option>
                      <option value="marina">Marina: yachts</option>
                    </select>
                  </label>
                  <label style={{ fontWeight: 400, margin: 0 }}><input type="checkbox" name="anonymize" defaultChecked={!!a.overrides?.anonymize} /> Show competitors as Competitor A-C</label>
                  <button className="btn ghost small">Apply</button>
                </form>
                <form action={publish}><input type="hidden" name="id" value={a.id} /><button className="btn gold">Approve and publish link</button></form>
              </div>
            )}
          </div>

          {a.published_at && <ReportViews auditId={a.id} />}

          <div className="card" style={{ overflowX: 'auto' }}>
            <h2>Scores</h2>
            <p className="muted small">Score = the business&apos;s value divided by the competitors&apos; median value, times 100, capped at 100. Hover a value for its unit.</p>
            <table>
              <thead><tr><th>Category</th><th className="num">Weight</th>{ids.map(i => <th key={i.id} className="num">{i.id === 'client' ? a.name : i.name}</th>)}<th className="num">Projected</th></tr></thead>
              <tbody>
                <tr><td><b>Overall</b></td><td></td>{ids.map(i => <td key={i.id} className={`num score ${cls(r.scores.overall[i.id])}`}>{r.scores.overall[i.id] ?? '-'}</td>)}<td className="num score">{r.report.brands.find(b => b.id === 'client')?.proposed?.overall ?? '-'}</td></tr>
                {r.scores.categories.map(c => {
                  const p = r.plan.projections.find(x => x.category === c.key);
                  return (
                    <tr key={c.key}>
                      <td>{c.label}{!c.checked && <span className="chip" style={{ marginLeft: 6 }}>not checked</span>}</td>
                      <td className="num muted">{c.weight}</td>
                      {ids.map(i => <td key={i.id} className="num" title={`${c.values[i.id] ?? 'no data'} ${c.unit}`}><span className={`score ${cls(c.scores[i.id])}`}>{c.scores[i.id] ?? '-'}</span> <span className="muted small">({c.values[i.id] ?? '-'})</span></td>)}
                      <td className="num" title={p?.rule}>{p?.mid != null ? `${p.mid} (${p.low}-${p.high})` : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Findings</h2>
            <p className="muted small">Written by rules from the collected data. Hide a finding to leave it out of the brief; edit the wording if needed (numbers should stay as measured).</p>
            {r.findings.map(f => (
              <div key={f.id} className={`finding ${hidden.has(f.id) ? 'hidden' : ''}`}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div><span className={`chip ${f.severity}`}>{f.severity}</span> <b>{f.title}</b></div>
                  <form action={setFinding}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="fid" value={f.id} /><input type="hidden" name="op" value={hidden.has(f.id) ? 'show' : 'hide'} /><button className="btn ghost small">{hidden.has(f.id) ? 'Show' : 'Hide'}</button></form>
                </div>
                <p style={{ margin: '4px 0' }}>{f.detail}</p>
                <div className="small muted">{f.evidence.length} source record(s){f.planItems.length ? ` · fixed by plan items ${f.planItems.join(', ')}` : ''}</div>
                <details className="small" style={{ marginTop: 4 }}><summary>Edit wording</summary>
                  <form action={setFinding} style={{ marginTop: 6 }}>
                    <input type="hidden" name="id" value={a.id} /><input type="hidden" name="fid" value={f.id} /><input type="hidden" name="op" value="edit" />
                    <div className="field"><input type="text" name="title" defaultValue={f.title} /></div>
                    <div className="field"><textarea name="detail" defaultValue={f.detail} /></div>
                    <button className="btn small">Save</button>
                  </form>
                </details>
              </div>
            ))}
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <h2>90-day plan</h2>
            <table>
              <thead><tr><th>ID</th><th>Action</th><th>Delivered by</th><th>Phase</th><th>Cadence</th><th>Measured by</th></tr></thead>
              <tbody>
                {r.plan.items.map(it => (
                  <tr key={it.id}>
                    <td className="muted">{it.id}</td>
                    <td>{it.action}{it.targets?.length ? <div className="small muted">Targets: {it.targets.slice(0, 4).join('; ')}{it.targets.length > 4 ? '…' : ''}</div> : null}</td>
                    <td><span className={`chip ${it.deliveredBy.kind}`}>{KIND_LABEL[it.deliveredBy.kind]}</span><div className="small">{it.deliveredBy.name}{it.preset ? `, ${it.preset} preset` : ''}</div></td>
                    <td className="small">{PHASE_LABEL[it.phase]}</td>
                    <td className="small">{it.cadence || '-'}</td>
                    <td className="small">{it.metric}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 style={{ marginTop: 16 }}>Then, ongoing</h3>
            <ul>{r.plan.ongoing.map((o, i) => <li key={i}>{o}</li>)}</ul>
            <h3>Sales results to track</h3>
            <p>{r.plan.salesMetrics.join(', ')}.</p>
          </div>

          {a.data.contentReview?.checks?.length ? (
            <div className="card">
              <h2>Brand and content review</h2>
              <table><tbody>{a.data.contentReview.checks.map((c, i) => (
                <tr key={i}><td><b>{c.item}</b></td><td><span className={`chip ${c.result === 'pass' ? 'ready' : c.result === 'partial' ? 'medium' : 'high'}`}>{c.result}</span></td><td>{c.note}{c.quote && <div className="small muted">&ldquo;{c.quote}&rdquo;</div>}</td></tr>
              ))}</tbody></table>
            </div>
          ) : null}

          <div className="card">
            <h2>After the meeting</h2>
            <form action={setOutcome} className="row">
              <input type="hidden" name="id" value={a.id} />
              <button name="outcome" value="won" className={`btn small ${a.outcome === 'won' ? 'gold' : 'ghost'}`}>Won</button>
              <button name="outcome" value="follow_up" className={`btn small ${a.outcome === 'follow_up' ? 'gold' : 'ghost'}`}>Follow up</button>
              <button name="outcome" value="lost" className={`btn small ${a.outcome === 'lost' ? 'gold' : 'ghost'}`}>Lost</button>
            </form>
            <p className="small muted">Won: this audit becomes the baseline, the plan becomes the agent build list, and the audit re-runs every 30 days against the same competitors.</p>
            <form action={reanalyze}><input type="hidden" name="id" value={a.id} /><button className="btn ghost small">Recalculate scores and brief</button></form>
          </div>

          <details className="card"><summary>Activity log</summary><div className="log" style={{ marginTop: 10 }}>{logs.map((l, i) => <div key={i} className={l.level}>{new Date(l.at).toLocaleString('en-US')}  {l.message}</div>)}</div></details>
        </>
      )}
    </>
  );
}

export type { BrandId };
