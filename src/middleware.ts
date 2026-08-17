import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/login',
  '/download',
  '/result',
  '/api/auth/login',
  '/api/app-updates',
  '/api/public/results',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // In middleware (edge runtime), avoid JWT verification libraries that may fail.
  // Presence of the auth cookie is enough for routing; API routes still verify token.
  const hasAdminCookie = Boolean(req.cookies.get(COOKIE_NAME)?.value);

  // Protect API routes (return 401)
  if (pathname.startsWith('/api/')) {
    if (!hasAdminCookie) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Protect admin pages (redirect to login)
  if (!hasAdminCookie) {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    return NextResponse.redirect(new URL(`${base}/login`, req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
