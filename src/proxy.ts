import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, validSession } from '@/lib/auth';

// Everything is behind the app password except the shared report links, the login page, and the
// job and cron endpoints (which check their own secret).
export function proxy(req: NextRequest) {
  if (!process.env.APP_PASSWORD && process.env.NODE_ENV !== 'production') return NextResponse.next();
  if (validSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) return new NextResponse('Unauthorized', { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!login|r/|report/|api/jobs|api/cron|_next/|favicon.ico|robots.txt).*)'],
};
