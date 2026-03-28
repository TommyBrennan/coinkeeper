import { NextRequest, NextResponse } from "next/server";

/**
 * Security headers applied to every response.
 * Protects against clickjacking, MIME sniffing, XSS, and data leaks.
 */
const securityHeaders: Record<string, string> = {
  // Prevent clickjacking — only allow same-origin framing
  "X-Frame-Options": "DENY",
  // Block MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  // Enable browser XSS filter (legacy browsers)
  "X-XSS-Protection": "1; mode=block",
  // Control referrer information leakage
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Restrict browser features/APIs
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=()",
  // Content Security Policy — allow self, inline styles (Tailwind), and data URIs for images
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

/**
 * Apply security headers to a response.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Middleware to protect routes and add security headers.
 * Redirects unauthenticated users to /auth/login.
 * Auth pages and API routes for auth are excluded.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow auth pages, auth API routes, health check, and Telegram webhook
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/telegram/webhook")
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Allow static assets, Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Check for session cookie
  const sessionToken = req.cookies.get("ck_session")?.value;
  if (!sessionToken) {
    const loginUrl = new URL("/auth/login", req.url);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  // Match all routes except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
