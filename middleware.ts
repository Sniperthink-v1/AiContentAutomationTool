import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Get session cookie
  const sessionCookie = request.cookies.get('session')

  // Redirect to login if not authenticated and trying to access protected route
  if (!sessionCookie && !isPublicRoute && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if authenticated and trying to access auth pages
  if (sessionCookie && isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only match dashboard routes and root
    '/dashboard/:path*',
    '/login',
    '/signup',
    '/'
  ],
}
