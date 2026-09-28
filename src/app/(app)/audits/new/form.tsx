'use client';
import { useActionState } from 'react';
import { startAudit } from '@/app/actions';

export default function NewAuditForm({ industries }: { industries: { key: string; label: string }[] }) {
  const [state, action, pending] = useActionState(startAudit, null);
  return (
    <form action={action} className="grid2">
      <div className="card">
        <h2>The business</h2>
        <div className="field"><label htmlFor="name">Business or personal brand name</label><input id="name" name="name" type="text" required placeholder="Remodeled-for-You" /></div>
        <div className="field"><label htmlFor="website">Website</label><input id="website" name="website" type="text" required placeholder="remodeledforyou.com" /></div>
        <div className="field"><label htmlFor="market">Market or service area</label><input id="market" name="market" type="text" required placeholder="Orlando, FL" /><div className="hint">City and state. The map grid and searches center here.</div></div>
        <div className="field"><label htmlFor="industry">Industry</label>
          <select id="industry" name="industry" defaultValue="remodeler">{industries.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}</select></div>
        <div className="field"><label htmlFor="services">Main services (optional)</label><input id="services" name="services" type="text" placeholder="kitchen remodel, bathroom remodel, home additions" /><div className="hint">Comma-separated. Leave blank to use the industry&apos;s standard list.</div></div>
        <div className="field"><label><input type="checkbox" name="spanish" /> Also audit Spanish-language searches and questions</label></div>
      </div>
      <div className="card">
        <h2>Profiles</h2>
        <div className="field"><label htmlFor="gbpUrl">Google Business Profile link (optional)</label><input id="gbpUrl" name="gbpUrl" type="text" placeholder="https://maps.app.goo.gl/..." /><div className="hint">The tool also finds it by name; you confirm the match.</div></div>
        <div className="field"><label htmlFor="youtube">YouTube channel</label><input id="youtube" name="youtube" type="text" placeholder="https://youtube.com/@..." /></div>
        <div className="field"><label htmlFor="instagram">Instagram</label><input id="instagram" name="instagram" type="text" /></div>
        <div className="field"><label htmlFor="tiktok">TikTok</label><input id="tiktok" name="tiktok" type="text" /></div>
        <div className="field"><label htmlFor="facebook">Facebook</label><input id="facebook" name="facebook" type="text" /></div>
        <div className="field"><label htmlFor="linkedin">LinkedIn</label><input id="linkedin" name="linkedin" type="text" /></div>
      </div>
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h2>Audit type</h2>
        <div className="row" style={{ gap: 24, marginBottom: 12 }}>
          <label style={{ fontWeight: 400 }}><input type="radio" name="tier" value="full" defaultChecked /> <b>Full audit</b>: about $3-5 in data, 15-30 minutes. Before a meeting.</label>
          <label style={{ fontWeight: 400 }}><input type="radio" name="tier" value="quick" /> <b>Quick audit</b>: about $0.50-1, a few minutes. For outreach lists; competitors are picked automatically.</label>
        </div>
        <div className="field"><label htmlFor="notes">Notes (internal)</label><textarea id="notes" name="notes" placeholder="Anything you know about the prospect" /></div>
        {state?.error && <p className="s-bad">{state.error}</p>}
        <button className="btn gold" disabled={pending}>{pending ? 'Starting…' : 'Start audit'}</button>
      </div>
    </form>
  );
}
