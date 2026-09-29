import { recordBeacon } from '@/lib/tracking';

// Beacons from shared report pages: opens, stops, clicks and active time. Always answers 204 so
// a viewer never sees an error; bad or untracked beacons are simply dropped.

export async function POST(req: Request) {
  try { await recordBeacon(await req.text(), req.headers); } catch (e) { console.error('track', e); }
  return new Response(null, { status: 204 });
}
