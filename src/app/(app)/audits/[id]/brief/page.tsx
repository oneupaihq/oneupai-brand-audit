import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getAudit } from '@/lib/audits';
import { KIND_LABEL } from '@/lib/labels';

export default async function BriefPage(props: PageProps<'/audits/[id]/brief'>) {
  await connection();
  const { id } = await props.params;
  const a = await getAudit(id);
  if (!a) notFound();
  const r = a.results;
  if (!r) return <p>The brief is ready once the audit finishes.</p>;
  const b = r.brief;
  const hidden = new Set(a.overrides?.hiddenFindings || []);
  const briefs = r.plan.agentBriefs;
  return (
    <>
      <div className="row noprint" style={{ justifyContent: 'space-between' }}>
        <Link href={`/audits/${a.id}`}>&larr; Back to the audit</Link>
        <span className="small muted">Internal: not shared with the prospect. Use your browser&apos;s print to save a PDF.</span>
      </div>
      <h1 style={{ marginTop: 12 }}>Strategy brief: {a.name}</h1>
      <p className="muted">{a.market} · {new Date(r.computedAt).toLocaleDateString()} {a.sample && <span className="chip sample">Sample data</span>}</p>
      <div className="card"><h2>Headline</h2><p style={{ fontSize: 17, margin: 0 }}>{b.headline}</p></div>
      <div className="card"><h2>Talking points</h2><ol>{b.talkingPoints.map((t, i) => <li key={i} style={{ marginBottom: 8 }}>{t}</li>)}</ol>
        {b.dropped.length > 0 && <p className="small muted">{b.dropped.length} AI-written sentence(s) were removed by the fact check and replaced with the rule-written version.</p>}</div>
      <div className="card"><h2>Likely objections</h2>{b.objections.map((o, i) => <div key={i} style={{ marginBottom: 12 }}><b>&ldquo;{o.objection}&rdquo;</b><p style={{ margin: '4px 0 0' }}>{o.answer}</p></div>)}</div>
      <div className="grid2">
        <div className="card"><h2>Ready agents to offer</h2><ul>{b.offer.agents.map(x => <li key={x}>{x}</li>)}</ul></div>
        <div className="card"><h2>Agents to build or adapt</h2><ul>{b.offer.build.map(x => <li key={x}>{x}</li>)}</ul></div>
      </div>
      <div className="card"><h2>Services</h2><ul>{b.offer.services.map(x => <li key={x}>{x}</li>)}</ul></div>
      <div className="card"><h2>Agent briefs</h2>
        {briefs.map((ab, i) => (
          <div key={i} className="finding">
            <b>{ab.agent}{ab.preset ? `, ${ab.preset} preset` : ''}</b> <span className={`chip ${ab.kind}`}>{KIND_LABEL[ab.kind]}</span>
            <div className="small muted">Platforms: {ab.platforms.join(', ')} · Pace: {ab.cadence}</div>
            {ab.titles.length > 0 && <ul className="small">{ab.titles.map(t => <li key={t}>{t}</li>)}</ul>}
          </div>
        ))}
      </div>
      <div className="card"><h2>All findings</h2><ul>{r.findings.filter(f => !hidden.has(f.id)).map(f => <li key={f.id}><b>{f.title}.</b> {f.detail}</li>)}</ul></div>
      <div className="card"><h2>Measure these</h2><p>Visibility: the same audit, re-run monthly. Engagement: Google profile calls and clicks, YouTube views, website visits by source. Sales: {r.plan.salesMetrics.join(', ').toLowerCase()}.</p><p className="small muted">At signing, ask for manager access to the Google profile, YouTube and Google Analytics, a tracked phone number, and 6 months of leads and deals by source.</p></div>
    </>
  );
}
