import NextAuth from "next-auth"
import { NextResponse, type NextRequest } from "next/server"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/interview",
  "/history",
  "/analytics",
  "/resume",
]

const AUTH_PAGES = ["/login", "/register"]

/**
 * Redirect helper. Next requires an absolute Location, so the target is
 * resolved against `req.nextUrl` — always the app's own origin, which keeps
 * this free of open-redirect risk.
 *
 * Note that NextAuth's `auth()` wrapper rewrites the request URL to AUTH_URL /
 * NEXTAUTH_URL when either is set, so these redirects land on that origin
 * regardless of the incoming Host. AUTH_URL must therefore match the deployed
 * domain in production, or users will be redirected to the wrong host.
 */
function redirectTo(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.nextUrl))
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Fail closed: require a concrete user id rather than a truthy session
  // object. A session that failed to decode can still be a non-null value,
  // which would otherwise read as "logged in".
  const isLoggedIn = Boolean(req.auth?.user?.id)

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  // Server-side gate. Previously each page checked `useSession` on the client,
  // which rendered protected content briefly before redirecting.
  if (isProtected && !isLoggedIn) {
    const callback = encodeURIComponent(pathname + req.nextUrl.search)
    return redirectTo(req, `/login?callbackUrl=${callback}`)
  }

  // Signed-in users have no use for the login or register screens.
  if (isLoggedIn && AUTH_PAGES.includes(pathname)) {
    return redirectTo(req, "/dashboard")
  }

  return NextResponse.next()
})

export const config = {
  // Skip Next internals and static files. API routes do their own session
  // checks and are excluded here so they return 401 JSON rather than a
  // redirect to an HTML page.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
}
