import { after } from 'next/server';
import { jobSecret, kick, runNext } from '@/lib/jobs';

// Runs one audit step per invocation. The step itself stays well under this limit.
export const maxDuration = 600;

export async function POST(req: Request) {
  if (req.headers.get('x-job-secret') !== jobSecret()) return new Response('Forbidden', { status: 403 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return new Response('Missing id', { status: 400 });
  after(async () => {
    const again = await runNext(id);
    if (again) await kick(id);
  });
  return Response.json({ accepted: true }, { status: 202 });
}
