import { renderWrittenReport } from '@/lib/engine/written';
import { HTML_HEADERS, openReport } from '@/lib/report-access';
import { trackingScript } from '@/lib/tracking';

// The written report: the same audit as a document to read, print or save as PDF.

export async function GET(_req: Request, ctx: RouteContext<'/r/[slug]/report'>) {
  const { slug } = await ctx.params;
  const r = await openReport(slug);
  if (r instanceof Response) return r;
  const html = renderWrittenReport(r.a, r.a.results!, { threeDUrl: `/r/${slug}`, tracking: r.track ? trackingScript(slug, 'report') : '' });
  return new Response(html, { headers: HTML_HEADERS });
}
