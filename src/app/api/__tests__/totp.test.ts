/**
 * Integration tests for /api/auth/totp routes.
 * Tests setup, enable, disable, status, and backup-codes endpoints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const {
  mockUserModel,
  mockSessionModel,
  mockRequireApiUser,
  mockGenerateTotpSecret,
  mockGenerateTotpUri,
  mockGenerateQrCodeDataUrl,
  mockVerifyTotpToken,
  mockVerifyBackupCode,
  mockGenerateBackupCodes,
  mockCreateSession,
} = vi.hoisted(() => {
  const createModel = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
  });

  return {
    mockUserModel: createModel(),
    mockSessionModel: createModel(),
    mockRequireApiUser: vi.fn(),
    mockGenerateTotpSecret: vi.fn().mockReturnValue("JBSWY3DPEHPK3PXP"),
    mockGenerateTotpUri: vi.fn().mockReturnValue("otpauth://totp/CoinKeeper:test@example.com?secret=JBSWY3DPEHPK3PXP"),
    mockGenerateQrCodeDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,test-qr"),
    mockVerifyTotpToken: vi.fn().mockReturnValue(true),
    mockVerifyBackupCode: vi.fn().mockReturnValue(0),
    mockGenerateBackupCodes: vi.fn().mockReturnValue({
      plain: ["ABCD-1234", "EFGH-5678"],
      hashed: ["hash1", "hash2"],
    }),
    mockCreateSession: vi.fn().mockResolvedValue("mock-session-token"),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    user: mockUserModel,
    session: mockSessionModel,
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({ user: mockUserModel })),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireApiUser: mockRequireApiUser,
}));

vi.mock("@/lib/totp", () => ({
  generateTotpSecret: mockGenerateTotpSecret,
  generateTotpUri: mockGenerateTotpUri,
  generateQrCodeDataUrl: mockGenerateQrCodeDataUrl,
  verifyTotpToken: mockVerifyTotpToken,
  generateBackupCodes: mockGenerateBackupCodes,
  hashBackupCode: vi.fn().mockReturnValue("mocked-hash"),
  verifyBackupCode: mockVerifyBackupCode,
}));

vi.mock("@/lib/session", () => ({
  createSession: mockCreateSession,
}));

const mockUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireApiUser.mockResolvedValue({ user: mockUser, error: false });
});

// ── /api/auth/totp/setup ──────────────────────────────────────────────────

describe("POST /api/auth/totp/setup", () => {
  it("should return QR code and secret for user without TOTP", async () => {
    mockUserModel.findUnique.mockResolvedValue({ totpEnabled: false });
    mockUserModel.update.mockResolvedValue({});

    const { POST } = await import("@/app/api/auth/totp/setup/route");
    const response = await POST();
    const { status, data } = await parseResponse<{
      secret: string;
      qrCodeDataUrl: string;
      uri: string;
    }>(response);

    expect(status).toBe(200);
    expect(data.secret).toBe("JBSWY3DPEHPK3PXP");
    expect(data.qrCodeDataUrl).toContain("data:image/png");
    expect(data.uri).toContain("otpauth://totp");
    expect(mockUserModel.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { totpSecret: "JBSWY3DPEHPK3PXP", totpEnabled: false },
    });
  });

  it("should reject if TOTP is already enabled", async () => {
    mockUserModel.findUnique.mockResolvedValue({ totpEnabled: true });

    const { POST } = await import("@/app/api/auth/totp/setup/route");
    const response = await POST();
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("already enabled");
  });

  it("should return 401 for unauthenticated requests", async () => {
    mockRequireApiUser.mockResolvedValue({ user: null, error: true });

    const { POST } = await import("@/app/api/auth/totp/setup/route");
    const response = await POST();
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });
});

// ── /api/auth/totp/enable ─────────────────────────────────────────────────

describe("POST /api/auth/totp/enable", () => {
  it("should enable TOTP and return backup codes", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpSecret: "JBSWY3DPEHPK3PXP",
      totpEnabled: false,
    });
    mockVerifyTotpToken.mockReturnValue(true);
    mockUserModel.update.mockResolvedValue({});

    const { POST } = await import("@/app/api/auth/totp/enable/route");
    const request = createRequest("/api/auth/totp/enable", {
      method: "POST",
      body: { code: "123456" },
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{
      enabled: boolean;
      backupCodes: string[];
    }>(response);

    expect(status).toBe(200);
    expect(data.enabled).toBe(true);
    expect(data.backupCodes).toHaveLength(2);
    expect(mockUserModel.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        totpEnabled: true,
        totpBackupCodes: JSON.stringify(["hash1", "hash2"]),
      },
    });
  });

  it("should reject invalid TOTP code", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpSecret: "JBSWY3DPEHPK3PXP",
      totpEnabled: false,
    });
    mockVerifyTotpToken.mockReturnValue(false);

    const { POST } = await import("@/app/api/auth/totp/enable/route");
    const request = createRequest("/api/auth/totp/enable", {
      method: "POST",
      body: { code: "000000" },
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("Invalid TOTP code");
  });

  it("should reject if no secret exists", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpSecret: null,
      totpEnabled: false,
    });

    const { POST } = await import("@/app/api/auth/totp/enable/route");
    const request = createRequest("/api/auth/totp/enable", {
      method: "POST",
      body: { code: "123456" },
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("No TOTP secret found");
  });

  it("should reject if already enabled", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpSecret: "JBSWY3DPEHPK3PXP",
      totpEnabled: true,
    });

    const { POST } = await import("@/app/api/auth/totp/enable/route");
    const request = createRequest("/api/auth/totp/enable", {
      method: "POST",
      body: { code: "123456" },
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("should reject missing code", async () => {
    const { POST } = await import("@/app/api/auth/totp/enable/route");
    const request = createRequest("/api/auth/totp/enable", {
      method: "POST",
      body: {},
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });
});

// ── /api/auth/totp/disable ────────────────────────────────────────────────

describe("POST /api/auth/totp/disable", () => {
  it("should disable TOTP with valid code", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpSecret: "JBSWY3DPEHPK3PXP",
      totpEnabled: true,
    });
    mockVerifyTotpToken.mockReturnValue(true);
    mockUserModel.update.mockResolvedValue({});

    const { POST } = await import("@/app/api/auth/totp/disable/route");
    const request = createRequest("/api/auth/totp/disable", {
      method: "POST",
      body: { code: "123456" },
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ disabled: boolean }>(
      response
    );

    expect(status).toBe(200);
    expect(data.disabled).toBe(true);
    expect(mockUserModel.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: null,
      },
    });
  });

  it("should reject invalid TOTP code", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpSecret: "JBSWY3DPEHPK3PXP",
      totpEnabled: true,
    });
    mockVerifyTotpToken.mockReturnValue(false);

    const { POST } = await import("@/app/api/auth/totp/disable/route");
    const request = createRequest("/api/auth/totp/disable", {
      method: "POST",
      body: { code: "000000" },
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("should reject if TOTP is not enabled", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpSecret: null,
      totpEnabled: false,
    });

    const { POST } = await import("@/app/api/auth/totp/disable/route");
    const request = createRequest("/api/auth/totp/disable", {
      method: "POST",
      body: { code: "123456" },
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });
});

// ── /api/auth/totp/status ─────────────────────────────────────────────────

describe("GET /api/auth/totp/status", () => {
  it("should return enabled=false for user without TOTP", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpEnabled: false,
      totpBackupCodes: null,
    });

    const { GET } = await import("@/app/api/auth/totp/status/route");
    const response = await GET();
    const { status, data } = await parseResponse<{
      enabled: boolean;
      backupCodesRemaining: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.enabled).toBe(false);
    expect(data.backupCodesRemaining).toBe(0);
  });

  it("should return enabled=true with backup code count", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpEnabled: true,
      totpBackupCodes: JSON.stringify(["hash1", "hash2", "hash3"]),
    });

    const { GET } = await import("@/app/api/auth/totp/status/route");
    const response = await GET();
    const { status, data } = await parseResponse<{
      enabled: boolean;
      backupCodesRemaining: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.enabled).toBe(true);
    expect(data.backupCodesRemaining).toBe(3);
  });

  it("should return 401 for unauthenticated requests", async () => {
    mockRequireApiUser.mockResolvedValue({ user: null, error: true });

    const { GET } = await import("@/app/api/auth/totp/status/route");
    const response = await GET();
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });
});

// ── /api/auth/totp/backup-codes ───────────────────────────────────────────

describe("POST /api/auth/totp/backup-codes", () => {
  it("should regenerate backup codes with valid TOTP code", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpSecret: "JBSWY3DPEHPK3PXP",
      totpEnabled: true,
    });
    mockVerifyTotpToken.mockReturnValue(true);
    mockUserModel.update.mockResolvedValue({});

    const { POST } = await import(
      "@/app/api/auth/totp/backup-codes/route"
    );
    const request = createRequest("/api/auth/totp/backup-codes", {
      method: "POST",
      body: { code: "123456" },
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{
      backupCodes: string[];
    }>(response);

    expect(status).toBe(200);
    expect(data.backupCodes).toHaveLength(2);
  });

  it("should reject invalid TOTP code", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpSecret: "JBSWY3DPEHPK3PXP",
      totpEnabled: true,
    });
    mockVerifyTotpToken.mockReturnValue(false);

    const { POST } = await import(
      "@/app/api/auth/totp/backup-codes/route"
    );
    const request = createRequest("/api/auth/totp/backup-codes", {
      method: "POST",
      body: { code: "000000" },
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("should reject if TOTP is not enabled", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      totpSecret: null,
      totpEnabled: false,
    });

    const { POST } = await import(
      "@/app/api/auth/totp/backup-codes/route"
    );
    const request = createRequest("/api/auth/totp/backup-codes", {
      method: "POST",
      body: { code: "123456" },
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });
});

// ── /api/auth/totp/verify (login 2FA) ────────────────────────────────────

describe("POST /api/auth/totp/verify", () => {
  function makePendingCookie(overrides: Record<string, unknown> = {}) {
    const payload = {
      userId: "user-1",
      token: "test-pending-token",
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min from now
      ...overrides,
    };
    return Buffer.from(JSON.stringify(payload)).toString("base64");
  }

  function createRequestWithCookie(
    url: string,
    options: { method?: string; body?: unknown; cookie?: string }
  ) {
    const { method = "POST", body, cookie } = options;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (cookie) {
      headers["Cookie"] = cookie;
    }
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    return new NextRequest(new URL(url, "http://localhost:3000"), init as never);
  }

  it("should verify TOTP code and create session", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      id: "user-1",
      totpEnabled: true,
      totpSecret: "JBSWY3DPEHPK3PXP",
      totpBackupCodes: JSON.stringify(["hash1", "hash2"]),
    });
    mockVerifyTotpToken.mockReturnValue(true);

    const { POST } = await import("@/app/api/auth/totp/verify/route");
    const request = createRequestWithCookie("/api/auth/totp/verify", {
      body: { code: "123456" },
      cookie: `ck_pending_2fa=${makePendingCookie()}`,
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ success: boolean }>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCreateSession).toHaveBeenCalledWith("user-1");
  });

  it("should verify backup code and consume it", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      id: "user-1",
      totpEnabled: true,
      totpSecret: "JBSWY3DPEHPK3PXP",
      totpBackupCodes: JSON.stringify(["hash1", "hash2", "hash3"]),
    });
    mockVerifyTotpToken.mockReturnValue(false);
    mockVerifyBackupCode.mockReturnValue(1); // matches index 1

    const { POST } = await import("@/app/api/auth/totp/verify/route");
    const request = createRequestWithCookie("/api/auth/totp/verify", {
      body: { code: "ABCD-1234" },
      cookie: `ck_pending_2fa=${makePendingCookie()}`,
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{
      success: boolean;
      backupCodeUsed: boolean;
      backupCodesRemaining: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.backupCodeUsed).toBe(true);
    expect(data.backupCodesRemaining).toBe(2);
    expect(mockCreateSession).toHaveBeenCalledWith("user-1");
    // Verify the backup code was removed from storage
    expect(mockUserModel.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { totpBackupCodes: JSON.stringify(["hash1", "hash3"]) },
    });
  });

  it("should reject invalid code", async () => {
    mockUserModel.findUnique.mockResolvedValue({
      id: "user-1",
      totpEnabled: true,
      totpSecret: "JBSWY3DPEHPK3PXP",
      totpBackupCodes: JSON.stringify(["hash1"]),
    });
    mockVerifyTotpToken.mockReturnValue(false);
    mockVerifyBackupCode.mockReturnValue(-1);

    const { POST } = await import("@/app/api/auth/totp/verify/route");
    const request = createRequestWithCookie("/api/auth/totp/verify", {
      body: { code: "000000" },
      cookie: `ck_pending_2fa=${makePendingCookie()}`,
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(401);
    expect(data.error).toContain("Invalid verification code");
  });

  it("should reject missing pending-2fa cookie", async () => {
    const { POST } = await import("@/app/api/auth/totp/verify/route");
    const request = createRequestWithCookie("/api/auth/totp/verify", {
      body: { code: "123456" },
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(401);
    expect(data.error).toContain("No pending 2FA session");
  });

  it("should reject expired pending-2fa token", async () => {
    const { POST } = await import("@/app/api/auth/totp/verify/route");
    const request = createRequestWithCookie("/api/auth/totp/verify", {
      body: { code: "123456" },
      cookie: `ck_pending_2fa=${makePendingCookie({ expiresAt: Date.now() - 1000 })}`,
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(401);
    expect(data.error).toContain("expired");
  });

  it("should reject missing code in body", async () => {
    const { POST } = await import("@/app/api/auth/totp/verify/route");
    const request = createRequestWithCookie("/api/auth/totp/verify", {
      body: {},
      cookie: `ck_pending_2fa=${makePendingCookie()}`,
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });
});
