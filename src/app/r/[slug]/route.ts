import { cookies } from 'next/headers';
import { getBySlug } from '@/lib/audits';
import { SESSION_COOKIE, validSession } from '@/lib/auth';
import { REPORT_TEMPLATE, REPORT_VERSION } from '@/lib/report-template.generated';

// The shareable 3D report. Public when published and not expired; otherwise only visible to a
// signed-in user (the preview from the review screen).

const escHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function notAvailable(msg: string, status = 404) {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Report not available</title><body style="font:16px/1.5 Arial,sans-serif;background:#f6f2ec;color:#1d2430;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px"><div style="max-width:420px;text-align:center"><h1 style="font-size:22px">This report is not available</h1><p>${msg}</p><p style="color:#5d6878;font-size:14px">Prepared by OneUpAI</p></div></body>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(_req: Request, ctx: RouteContext<'/r/[slug]'>) {
  const { slug } = await ctx.params;
  const a = await getBySlug(slug);
  if (!a || !a.results?.report) return notAvailable('The link may be mistyped.');
  const signedIn = validSession((await cookies()).get(SESSION_COOKIE)?.value) || (!process.env.APP_PASSWORD && process.env.NODE_ENV !== 'production');
  const live = a.status === 'published' && (!a.expires_at || new Date(a.expires_at) > new Date());
  if (!live && !signedIn) return notAvailable(a.status === 'published' ? 'This link has expired. Ask your OneUpAI contact for a fresh one.' : 'The link may be mistyped.');

  const report = a.results.report;
  const data = JSON.stringify(report).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const html = REPORT_TEMPLATE
    .replaceAll('{{TITLE}}', escHtml(`${report.client.name} · Presence audit`))
    .replaceAll('{{CLIENT}}', escHtml(report.client.name))
    .replaceAll('{{MARKET}}', escHtml(report.client.market))
    .replaceAll('{{CHIP}}', escHtml(report.sample ? 'Sample data' : report.client.industry))
    .replaceAll('{{VERSION}}', REPORT_VERSION)
    .replace('{{DATA}}', () => data);
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
