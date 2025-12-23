import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Simple cookie-based auth check
  // Better Auth uses '__Secure-better-auth.session_token' in production (HTTPS)
  // and 'better-auth.session_token' in development (HTTP)
  const sessionToken = req.cookies.get('__Secure-better-auth.session_token') ||
    req.cookies.get('better-auth.session_token')
  const isAuth = !!sessionToken

  const isAuthPage = req.nextUrl.pathname.startsWith("/signin") || req.nextUrl.pathname.startsWith("/signup")
  const isAdminPage = req.nextUrl.pathname.startsWith("/admin")
  const isAppPage = /^\/(describe|bg-remover|runway-prompt|metadata-gen|history|buy-credits|payment-requests|settings)/.test(req.nextUrl.pathname)
  const isPublicPage = req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/api")

  // Allow public pages and API routes
  if (isPublicPage) {
    return NextResponse.next()
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isAuth) {
    return NextResponse.redirect(new URL("/describe", req.url))
  }

  // Redirect unauthenticated users to home page
  if (!isAuth && (isAppPage || isAdminPage)) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Note: Admin role checking is done in the layout component
  // since we can't decode the session in Edge Runtime

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/:app(describe|bg-remover|runway-prompt|metadata-gen|history|buy-credits|payment-requests|settings)",
    "/:app(describe|bg-remover|runway-prompt|metadata-gen|history|buy-credits|payment-requests|settings)/:path*",
    "/admin/:path*",
    "/signin",
    "/signup"
  ]
}