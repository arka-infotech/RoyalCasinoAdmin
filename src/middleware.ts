import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';
import { stripBasePath } from '@/lib/basePath';

const PUBLIC_PATHS = [
  '/login',
  '/download',
  '/result',
  '/api/auth/login',
  '/api/app-updates',
  '/api/public/results',
];

export function middleware(req: NextRequest) {
  const pathname = stripBasePath(req.nextUrl.pathname);

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const hasAdminCookie = Boolean(req.cookies.get(COOKIE_NAME)?.value);

  // Protect API routes (return 401)
  if (pathname.startsWith('/api/')) {
    if (!hasAdminCookie) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Root: send to login or dashboard (avoid hitting page.tsx redirect chain)
  if (pathname === '/') {
    const target = hasAdminCookie ? '/dashboard' : '/login';
    return NextResponse.redirect(new URL(target, req.url));
  }

  // Protect admin pages (redirect to login)
  if (!hasAdminCookie) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
