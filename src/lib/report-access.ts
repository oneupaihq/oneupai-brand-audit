import { cookies } from 'next/headers';
import { getBySlug, type AuditRow } from './audits';
import { SESSION_COOKIE, validSession } from './auth';

// Who may open a shared report link, for both the 3D page and the written report. Public when
// published and not expired; otherwise only a signed-in user (the preview from the review screen).
// Views are tracked only for the public, live link and never for a signed-in preview.

export const escHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function notAvailable(msg: string, status = 404) {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Report not available</title><body style="font:16px/1.5 Arial,sans-serif;background:#f6f2ec;color:#1d2430;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px"><div style="max-width:420px;text-align:center"><h1 style="font-size:22px">This report is not available</h1><p>${msg}</p><p style="font-size:14px">Prepared by OneUpAI</p></div></body>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function openReport(slug: string): Promise<{ a: AuditRow; track: boolean } | Response> {
  const a = await getBySlug(slug);
  if (!a || !a.results?.report) return notAvailable('The link may be mistyped.');
  const signedIn = validSession((await cookies()).get(SESSION_COOKIE)?.value) || (!process.env.APP_PASSWORD && process.env.NODE_ENV !== 'production');
  const live = a.status === 'published' && (!a.expires_at || new Date(a.expires_at) > new Date());
  if (!live && !signedIn) return notAvailable(a.status === 'published' ? 'This link has expired. Ask your OneUpAI contact for a fresh one.' : 'The link may be mistyped.');
  return { a, track: live && !signedIn };
}

export const HTML_HEADERS = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
