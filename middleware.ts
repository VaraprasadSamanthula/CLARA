import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow login page without authentication
  if (path === '/login') {
    return NextResponse.next();
  }

  // Allow API routes without authentication (they'll handle their own validation if needed)
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if user is authenticated for protected routes
  // Look for session_id cookie (new session-based auth) or legacy auth cookie
  const sessionId = request.cookies.get('session_id')?.value;
  const legacyAuth = request.cookies.get('auth')?.value;
  
  const isAuthenticated = sessionId || legacyAuth;

  // Protected routes that require authentication
  const protectedRoutes = ['/', '/dashboard', '/patients/register', '/patients/import'];
  const isProtectedRoute = protectedRoutes.some(route => 
    path === route || path.startsWith(route + '/')
  );

  // If not authenticated and trying to access protected route, redirect to login
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
