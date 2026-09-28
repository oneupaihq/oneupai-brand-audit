import Link from 'next/link';
import { sampleMode } from '@/lib/env';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <header className="top">
        <Link href="/" className="brand">OneUpAI <span>Brand Audit</span></Link>
        <nav>
          {sampleMode() && <span className="chip sample" title="DataForSEO or Google keys are missing, so new audits use sample data">Sample mode</span>}
          <Link href="/">Audits</Link>
          <Link href="/audits/new" className="btn small gold">New audit</Link>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
