/**
 * Tests for middleware security headers and route protection.
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

function createRequest(path: string, cookies?: Record<string, string>) {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  if (cookies) {
    for (const [key, value] of Object.entries(cookies)) {
      req.cookies.set(key, value);
    }
  }
  return req;
}

const EXPECTED_SECURITY_HEADERS = [
  "X-Frame-Options",
  "X-Content-Type-Options",
  "X-XSS-Protection",
  "Referrer-Policy",
  "Permissions-Policy",
  "Content-Security-Policy",
];

describe("middleware", () => {
  describe("security headers", () => {
    it("adds security headers to public pages", () => {
      const res = middleware(createRequest("/auth/login"));
      for (const header of EXPECTED_SECURITY_HEADERS) {
        expect(res.headers.get(header)).toBeTruthy();
      }
    });

    it("adds security headers to protected pages", () => {
      const res = middleware(
        createRequest("/dashboard", { ck_session: "valid-token" })
      );
      for (const header of EXPECTED_SECURITY_HEADERS) {
        expect(res.headers.get(header)).toBeTruthy();
      }
    });

    it("adds security headers to redirect responses", () => {
      const res = middleware(createRequest("/dashboard"));
      // Should redirect to login
      expect(res.status).toBe(307);
      for (const header of EXPECTED_SECURITY_HEADERS) {
        expect(res.headers.get(header)).toBeTruthy();
      }
    });

    it("sets X-Frame-Options to DENY", () => {
      const res = middleware(createRequest("/auth/login"));
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("sets X-Content-Type-Options to nosniff", () => {
      const res = middleware(createRequest("/auth/login"));
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("includes frame-ancestors none in CSP", () => {
      const res = middleware(createRequest("/auth/login"));
      const csp = res.headers.get("Content-Security-Policy");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("includes form-action self in CSP", () => {
      const res = middleware(createRequest("/auth/login"));
      const csp = res.headers.get("Content-Security-Policy");
      expect(csp).toContain("form-action 'self'");
    });
  });

  describe("route protection", () => {
    it("allows auth pages without session", () => {
      const res = middleware(createRequest("/auth/login"));
      expect(res.status).not.toBe(307);
    });

    it("allows auth API routes without session", () => {
      const res = middleware(createRequest("/api/auth/register"));
      expect(res.status).not.toBe(307);
    });

    it("allows health check without session", () => {
      const res = middleware(createRequest("/api/health"));
      expect(res.status).not.toBe(307);
    });

    it("allows telegram webhook without session", () => {
      const res = middleware(createRequest("/api/telegram/webhook"));
      expect(res.status).not.toBe(307);
    });

    it("redirects to login when no session cookie", () => {
      const res = middleware(createRequest("/dashboard"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/auth/login");
    });

    it("allows access with valid session cookie", () => {
      const res = middleware(
        createRequest("/dashboard", { ck_session: "valid-token" })
      );
      expect(res.status).not.toBe(307);
    });

    it("allows static assets without session", () => {
      const res = middleware(createRequest("/_next/static/chunk.js"));
      expect(res.status).not.toBe(307);
    });
  });
});
