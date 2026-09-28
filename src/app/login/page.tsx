import LoginForm from './form';

export default async function LoginPage(props: PageProps<'/login'>) {
  const sp = await props.searchParams;
  const next = typeof sp.next === 'string' ? sp.next : '/';
  return (
    <main style={{ maxWidth: 380, paddingTop: '14vh' }}>
      <div className="card">
        <h1>OneUpAI <span style={{ color: 'var(--gold)' }}>Brand Audit</span></h1>
        <p className="muted small">Sign in to run audits and share reports.</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
