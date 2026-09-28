import { INDUSTRY_OPTIONS } from '@/lib/industries';
import { sampleMode } from '@/lib/env';
import { connection } from 'next/server';
import NewAuditForm from './form';

export default async function NewAudit() {
  await connection();
  return (
    <>
      <h1>New audit</h1>
      <p className="muted small">About 5 minutes of your time. A full audit takes 15-30 minutes to run; you confirm competitors partway through.</p>
      {sampleMode() && <div className="banner warn">The DataForSEO or Google keys are not set, so this audit will use <b>sample data</b>. Add the keys in Vercel before auditing a real prospect.</div>}
      <NewAuditForm industries={INDUSTRY_OPTIONS} />
    </>
  );
}
