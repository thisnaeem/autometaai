import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Simple cookie-based auth check
  // Better Auth uses '__Secure-better-auth.session_token' in production (HTTPS)
  // and 'better-auth.session_token' in development (HTTP)
  const sessionToken = req.cookies.get('__Secure-better-auth.session_token') || 
                       req.cookies.get('better-auth.session_token')
  const isAuth = !!sessionToken

  const isAuthPage = req.nextUrl.pathname.startsWith("/auth")
  const isAdminPage = req.nextUrl.pathname.startsWith("/admin")
  const isAppPage = req.nextUrl.pathname.startsWith("/app")
  const isPublicPage = req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/api")

  // Allow public pages and API routes
  if (isPublicPage) {
    return NextResponse.next()
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isAuth) {
    return NextResponse.redirect(new URL("/app/describe", req.url))
  }

  // Redirect unauthenticated users to sign in
  if (!isAuth && (isAppPage || isAdminPage)) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }

  // Note: Admin role checking is done in the layout component
  // since we can't decode the session in Edge Runtime

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/app/:path*",
    "/admin/:path*",
    "/auth/:path*"
  ]
}