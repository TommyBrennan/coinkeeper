import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to protect routes.
 * Redirects unauthenticated users to /auth/login.
 * Auth pages and API routes for auth are excluded.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow auth pages and auth API routes
  if (pathname.startsWith("/auth") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow static assets, Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = req.cookies.get("ck_session")?.value;
  if (!sessionToken) {
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
