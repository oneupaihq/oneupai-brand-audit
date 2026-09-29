import { HTML_HEADERS, escHtml, openReport } from '@/lib/report-access';
import { REPORT_TEMPLATE, REPORT_VERSION } from '@/lib/report-template.generated';
import { trackingScript } from '@/lib/tracking';

// The shareable 3D report.

export async function GET(_req: Request, ctx: RouteContext<'/r/[slug]'>) {
  const { slug } = await ctx.params;
  const r = await openReport(slug);
  if (r instanceof Response) return r;
  const report = r.a.results!.report;
  const data = JSON.stringify(report).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const html = REPORT_TEMPLATE
    .replaceAll('{{TITLE}}', escHtml(`${report.client.name} · Presence audit`))
    .replaceAll('{{CLIENT}}', escHtml(report.client.name))
    .replaceAll('{{MARKET}}', escHtml(report.client.market))
    .replaceAll('{{CHIP}}', escHtml(report.sample ? 'Sample data' : report.client.industry))
    .replaceAll('{{VERSION}}', REPORT_VERSION)
    .replace('<!--TRACK-->', () => (r.track ? trackingScript(slug, '3d') : ''))
    .replace('{{DATA}}', () => data);
  return new Response(html, { headers: HTML_HEADERS });
}
