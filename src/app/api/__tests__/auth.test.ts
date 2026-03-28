/**
 * Integration tests for /api/auth routes.
 * Tests logout, register/options, register/verify, login/options, login/verify.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const {
  mockUserModel,
  mockCredentialModel,
  mockSessionModel,
  mockDestroySession,
  mockCreateSession,
  mockGenerateRegistrationOptions,
  mockVerifyRegistrationResponse,
  mockGenerateAuthenticationOptions,
  mockVerifyAuthenticationResponse,
  mockDbTransaction,
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
    mockCredentialModel: createModel(),
    mockSessionModel: createModel(),
    mockDestroySession: vi.fn().mockResolvedValue(undefined),
    mockCreateSession: vi.fn().mockResolvedValue("session-token-123"),
    mockGenerateRegistrationOptions: vi.fn().mockResolvedValue({
      challenge: "test-challenge-abc",
      rp: { name: "CoinKeeper", id: "localhost" },
      user: { id: "user-id", name: "test@example.com", displayName: "Test" },
      pubKeyCredParams: [],
    }),
    mockVerifyRegistrationResponse: vi.fn().mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: new Uint8Array([1, 2, 3]),
          publicKey: new Uint8Array([4, 5, 6]),
          counter: 0,
        },
      },
    }),
    mockGenerateAuthenticationOptions: vi.fn().mockResolvedValue({
      challenge: "test-auth-challenge-xyz",
      rpId: "localhost",
      allowCredentials: [],
    }),
    mockVerifyAuthenticationResponse: vi.fn().mockResolvedValue({
      verified: true,
      authenticationInfo: {
        newCounter: 1,
      },
    }),
    mockDbTransaction: vi.fn(),
  };
});

vi.mock("@/lib/session", () => ({
  destroySession: mockDestroySession,
  createSession: mockCreateSession,
}));

vi.mock("@/lib/webauthn", () => ({
  getWebAuthnConfig: () => ({
    rpName: "CoinKeeper",
    rpID: "localhost",
    origin: "http://localhost:3000",
  }),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: mockGenerateRegistrationOptions,
  verifyRegistrationResponse: mockVerifyRegistrationResponse,
  generateAuthenticationOptions: mockGenerateAuthenticationOptions,
  verifyAuthenticationResponse: mockVerifyAuthenticationResponse,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: mockUserModel,
    credential: mockCredentialModel,
    session: mockSessionModel,
    $transaction: mockDbTransaction,
  },
}));

// ── Import handlers after mocking ────────────────────────────────────────

import { POST as logoutPOST } from "../auth/logout/route";
import { POST as registerOptionsPOST } from "../auth/register/options/route";
import { POST as registerVerifyPOST } from "../auth/register/verify/route";
import { POST as loginOptionsPOST } from "../auth/login/options/route";
import { POST as loginVerifyPOST } from "../auth/login/verify/route";

// ── Tests ────────────────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("destroys the session and returns success", async () => {
    const res = await logoutPOST();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockDestroySession).toHaveBeenCalledOnce();
  });

  it("returns 500 if session destruction fails", async () => {
    mockDestroySession.mockRejectedValueOnce(new Error("DB error"));

    const res = await logoutPOST();
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(500);
    expect(data.error).toBe("Failed to log out");
  });
});

describe("POST /api/auth/register/options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserModel.findUnique.mockResolvedValue(null); // No existing user
  });

  it("generates registration options for a new user", async () => {
    const req = createRequest("http://localhost:3000/api/auth/register/options", {
      method: "POST",
      body: { name: "Test User", email: "test@example.com" },
    });

    const res = await registerOptionsPOST(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toHaveProperty("challenge", "test-challenge-abc");
    expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpName: "CoinKeeper",
        rpID: "localhost",
        userName: "test@example.com",
        userDisplayName: "Test User",
      })
    );

    // Verify cookies are set
    const cookies = res.headers.getSetCookie();
    const challengeCookie = cookies.find((c: string) => c.includes("ck_reg_challenge"));
    const userCookie = cookies.find((c: string) => c.includes("ck_reg_user"));
    expect(challengeCookie).toBeDefined();
    expect(userCookie).toBeDefined();
  });

  it("returns 409 if email already exists", async () => {
    mockUserModel.findUnique.mockResolvedValueOnce({
      id: "existing-user",
      email: "test@example.com",
    });

    const req = createRequest("http://localhost:3000/api/auth/register/options", {
      method: "POST",
      body: { name: "Test User", email: "test@example.com" },
    });

    const res = await registerOptionsPOST(req);
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(409);
    expect(data.error).toContain("already exists");
  });

  it("returns 400 for missing name", async () => {
    const req = createRequest("http://localhost:3000/api/auth/register/options", {
      method: "POST",
      body: { email: "test@example.com" },
    });

    const res = await registerOptionsPOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const req = createRequest("http://localhost:3000/api/auth/register/options", {
      method: "POST",
      body: { name: "Test", email: "not-an-email" },
    });

    const res = await registerOptionsPOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("returns 400 for empty name", async () => {
    const req = createRequest("http://localhost:3000/api/auth/register/options", {
      method: "POST",
      body: { name: "", email: "test@example.com" },
    });

    const res = await registerOptionsPOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });
});

describe("POST /api/auth/register/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserModel.create.mockResolvedValue({
      id: "new-user-1",
      name: "Test User",
      email: "test@example.com",
    });
  });

  it("returns 400 if registration cookies are missing", async () => {
    const req = createRequest("http://localhost:3000/api/auth/register/verify", {
      method: "POST",
      body: { id: "cred-id", response: {} },
    });

    const res = await registerVerifyPOST(req);
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(400);
    expect(data.error).toContain("expired");
  });

  it("returns 400 if verification fails", async () => {
    mockVerifyRegistrationResponse.mockResolvedValueOnce({
      verified: false,
      registrationInfo: null,
    });

    const req = createRequest("http://localhost:3000/api/auth/register/verify", {
      method: "POST",
      body: { id: "cred-id", response: {} },
      headers: {
        Cookie:
          "ck_reg_challenge=test-challenge; ck_reg_user=" +
          encodeURIComponent(JSON.stringify({ name: "Test", email: "test@example.com" })),
      },
    });

    const res = await registerVerifyPOST(req);
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(400);
    expect(data.error).toContain("verification failed");
  });

  it("creates user and session on successful verification", async () => {
    const req = createRequest("http://localhost:3000/api/auth/register/verify", {
      method: "POST",
      body: {
        id: "cred-id",
        response: { transports: ["internal"] },
      },
      headers: {
        Cookie:
          "ck_reg_challenge=test-challenge; ck_reg_user=" +
          encodeURIComponent(JSON.stringify({ name: "Test User", email: "test@example.com" })),
      },
    });

    const res = await registerVerifyPOST(req);
    const { status, data } = await parseResponse<{ success: boolean; userId: string }>(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.userId).toBe("new-user-1");
    expect(mockUserModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Test User",
          email: "test@example.com",
        }),
      })
    );
    expect(mockCreateSession).toHaveBeenCalledWith("new-user-1");
  });
});

describe("POST /api/auth/login/options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates authentication options for existing user", async () => {
    mockUserModel.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "test@example.com",
      credentials: [
        {
          credentialId: "Y3JlZC0x",
          transports: JSON.stringify(["internal"]),
        },
      ],
    });

    const req = createRequest("http://localhost:3000/api/auth/login/options", {
      method: "POST",
      body: { email: "test@example.com" },
    });

    const res = await loginOptionsPOST(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toHaveProperty("challenge", "test-auth-challenge-xyz");
    expect(mockGenerateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpID: "localhost",
        userVerification: "preferred",
      })
    );

    // Verify cookies are set
    const cookies = res.headers.getSetCookie();
    const challengeCookie = cookies.find((c: string) => c.includes("ck_auth_challenge"));
    const userCookie = cookies.find((c: string) => c.includes("ck_auth_user"));
    expect(challengeCookie).toBeDefined();
    expect(userCookie).toBeDefined();
  });

  it("returns 404 if user not found", async () => {
    mockUserModel.findUnique.mockResolvedValueOnce(null);

    const req = createRequest("http://localhost:3000/api/auth/login/options", {
      method: "POST",
      body: { email: "nobody@example.com" },
    });

    const res = await loginOptionsPOST(req);
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(404);
    expect(data.error).toContain("No account found");
  });

  it("returns 404 if user has no credentials", async () => {
    mockUserModel.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "test@example.com",
      credentials: [],
    });

    const req = createRequest("http://localhost:3000/api/auth/login/options", {
      method: "POST",
      body: { email: "test@example.com" },
    });

    const res = await loginOptionsPOST(req);
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(404);
    expect(data.error).toContain("No account found");
  });

  it("returns 400 for missing email", async () => {
    const req = createRequest("http://localhost:3000/api/auth/login/options", {
      method: "POST",
      body: {},
    });

    const res = await loginOptionsPOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const req = createRequest("http://localhost:3000/api/auth/login/options", {
      method: "POST",
      body: { email: "not-valid" },
    });

    const res = await loginOptionsPOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("handles credentials with malformed transports JSON", async () => {
    mockUserModel.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "test@example.com",
      credentials: [
        {
          credentialId: "Y3JlZC0x",
          transports: "not-valid-json",
        },
      ],
    });

    const req = createRequest("http://localhost:3000/api/auth/login/options", {
      method: "POST",
      body: { email: "test@example.com" },
    });

    const res = await loginOptionsPOST(req);
    const { status } = await parseResponse(res);

    // Should still succeed — malformed transports gracefully fallback to undefined
    expect(status).toBe(200);
  });

  it("handles credentials with null transports", async () => {
    mockUserModel.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "test@example.com",
      credentials: [
        {
          credentialId: "Y3JlZC0x",
          transports: null,
        },
      ],
    });

    const req = createRequest("http://localhost:3000/api/auth/login/options", {
      method: "POST",
      body: { email: "test@example.com" },
    });

    const res = await loginOptionsPOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(200);
  });
});

describe("POST /api/auth/login/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if auth cookies are missing", async () => {
    const req = createRequest("http://localhost:3000/api/auth/login/verify", {
      method: "POST",
      body: { id: "cred-id", response: {} },
    });

    const res = await loginVerifyPOST(req);
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(400);
    expect(data.error).toContain("expired");
  });

  it("returns 400 if credential not found", async () => {
    mockCredentialModel.findFirst.mockResolvedValueOnce(null);

    const req = createRequest("http://localhost:3000/api/auth/login/verify", {
      method: "POST",
      body: { id: "unknown-cred", response: {} },
      headers: {
        Cookie: "ck_auth_challenge=test-challenge; ck_auth_user=user-1",
      },
    });

    const res = await loginVerifyPOST(req);
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(400);
    expect(data.error).toContain("Credential not found");
  });

  it("returns 400 if verification fails", async () => {
    mockCredentialModel.findFirst.mockResolvedValueOnce({
      id: "cred-db-id",
      userId: "user-1",
      credentialId: "cred-id",
      publicKey: Buffer.from([4, 5, 6]),
      counter: BigInt(0),
      transports: null,
    });

    mockVerifyAuthenticationResponse.mockResolvedValueOnce({
      verified: false,
    });

    const req = createRequest("http://localhost:3000/api/auth/login/verify", {
      method: "POST",
      body: { id: "cred-id", response: {} },
      headers: {
        Cookie: "ck_auth_challenge=test-challenge; ck_auth_user=user-1",
      },
    });

    const res = await loginVerifyPOST(req);
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(400);
    expect(data.error).toContain("verification failed");
  });

  it("creates session and clears cookies on successful login", async () => {
    mockCredentialModel.findFirst.mockResolvedValueOnce({
      id: "cred-db-id",
      userId: "user-1",
      credentialId: "cred-id",
      publicKey: Buffer.from([4, 5, 6]),
      counter: BigInt(0),
      transports: JSON.stringify(["internal"]),
    });

    const req = createRequest("http://localhost:3000/api/auth/login/verify", {
      method: "POST",
      body: { id: "cred-id", response: {} },
      headers: {
        Cookie: "ck_auth_challenge=test-challenge; ck_auth_user=user-1",
      },
    });

    const res = await loginVerifyPOST(req);
    const { status, data } = await parseResponse<{ success: boolean }>(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);

    // Verify credential counter was updated
    expect(mockCredentialModel.update).toHaveBeenCalledWith({
      where: { id: "cred-db-id" },
      data: { counter: BigInt(1) },
    });

    // Verify session was created
    expect(mockCreateSession).toHaveBeenCalledWith("user-1");
  });

  it("handles credentials with malformed transports JSON", async () => {
    mockCredentialModel.findFirst.mockResolvedValueOnce({
      id: "cred-db-id",
      userId: "user-1",
      credentialId: "cred-id",
      publicKey: Buffer.from([4, 5, 6]),
      counter: BigInt(0),
      transports: "invalid-json",
    });

    const req = createRequest("http://localhost:3000/api/auth/login/verify", {
      method: "POST",
      body: { id: "cred-id", response: {} },
      headers: {
        Cookie: "ck_auth_challenge=test-challenge; ck_auth_user=user-1",
      },
    });

    const res = await loginVerifyPOST(req);
    const { status } = await parseResponse(res);

    // Should still succeed — transports fallback to undefined
    expect(status).toBe(200);
  });
});
