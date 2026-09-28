'use client';
import { useActionState } from 'react';
import { login } from '../actions';

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="pw">Password</label>
        <input id="pw" name="password" type="password" autoFocus required />
      </div>
      {state?.error && <p className="s-bad small">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
