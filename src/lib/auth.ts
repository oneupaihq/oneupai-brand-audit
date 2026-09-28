import { createHmac, timingSafeEqual } from 'crypto';
import { env } from './env';

export const SESSION_COOKIE = 'oua_session';

export function sessionToken() {
  return createHmac('sha256', env.appPassword || 'dev').update('oneupai-brand-audit-session-v1').digest('hex');
}

export function validSession(value?: string) {
  if (!value) return false;
  const a = Buffer.from(value), b = Buffer.from(sessionToken());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordOk(pw: string) {
  if (!env.appPassword) return process.env.NODE_ENV !== 'production';
  const a = Buffer.from(pw), b = Buffer.from(env.appPassword);
  return a.length === b.length && timingSafeEqual(a, b);
}
