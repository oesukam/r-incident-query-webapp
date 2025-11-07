import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page and API routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get('session')?.value;

  // Log for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Proxy]', {
      pathname,
      hasSession: !!sessionToken,
      tokenPreview: sessionToken?.substring(0, 20),
    });
  }

  // If no session or invalid session, redirect to login
  if (!sessionToken || !validateSession(sessionToken)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Proxy] Redirecting to login', { pathname });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Valid session, continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
