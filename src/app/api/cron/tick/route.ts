import { q } from '@/lib/db';
import { env } from '@/lib/env';
import { kick } from '@/lib/jobs';

// Every 5 minutes: restart any running audit that is not locked (a lost chain, or a step waiting
// on the DataForSEO queue).
export const maxDuration = 60;

export async function GET(req: Request) {
  if (env.cronSecret && req.headers.get('authorization') !== `Bearer ${env.cronSecret}`) return new Response('Forbidden', { status: 403 });
  const rows = await q<{ id: string }>(`select id from audits where status = 'running' and step is not null and (locked_until is null or locked_until < now()) and updated_at < now() - interval '1 minute' limit 20`);
  await Promise.all(rows.map(r => kick(r.id)));
  return Response.json({ restarted: rows.length });
}
