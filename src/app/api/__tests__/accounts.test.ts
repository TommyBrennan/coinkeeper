/**
 * Integration tests for /api/accounts routes.
 * Tests GET (list) and POST (create) endpoints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockAccount,
  createRequest,
  parseResponse,
} from "./helpers";

// ── Hoisted mocks (vi.mock factories are hoisted, so variables must be too) ──

const { mockUser, mockAccountModel } = vi.hoisted(() => {
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
    mockUser: {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    mockAccountModel: createModel(),
  };
});

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
  requireUser: vi.fn().mockResolvedValue(mockUser),
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
}));

vi.mock("@/lib/space-context", () => ({
  getSpaceContext: vi
    .fn()
    .mockResolvedValue({ spaceId: null, spaceName: null, role: null }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    account: mockAccountModel,
  },
}));

// ── Import handlers after mocking ─────────────────────────────────────────

import { GET, POST } from "../accounts/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "../accounts/[id]/route";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext } from "@/lib/space-context";

// ── Tests ─────────────────────────────────────────────────────────────────

describe("GET /api/accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
    vi.mocked(getSpaceContext).mockResolvedValue({
      spaceId: null,
      spaceName: null,
      role: null,
    });
  });

  it("returns personal accounts when not in a space", async () => {
    const accounts = [
      createMockAccount({ id: "acc-1", name: "Wallet" }),
      createMockAccount({ id: "acc-2", name: "Bank" }),
    ];
    mockAccountModel.findMany.mockResolvedValueOnce(accounts);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data).toHaveLength(2);
    expect(mockAccountModel.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", spaceId: null },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns space accounts when in a space", async () => {
    vi.mocked(getSpaceContext).mockResolvedValueOnce({
      spaceId: "space-1",
      spaceName: "Family",
      role: "owner",
    });
    const accounts = [createMockAccount({ spaceId: "space-1" })];
    mockAccountModel.findMany.mockResolvedValueOnce(accounts);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mockAccountModel.findMany).toHaveBeenCalledWith({
      where: { spaceId: "space-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValueOnce({
      user: null as never,
      error: true,
    });

    const response = await GET();
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });
});

describe("POST /api/accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
    vi.mocked(getSpaceContext).mockResolvedValue({
      spaceId: null,
      spaceName: null,
      role: null,
    });
  });

  it("creates an account with valid data", async () => {
    const newAccount = createMockAccount({ name: "New Wallet", type: "cash" });
    mockAccountModel.create.mockResolvedValueOnce(newAccount);

    const request = createRequest("/api/accounts", {
      method: "POST",
      body: { name: "New Wallet", type: "cash", currency: "EUR" },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<MockAccount>(response);

    expect(status).toBe(201);
    expect(data.name).toBe("New Wallet");
    expect(mockAccountModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        name: "New Wallet",
        type: "cash",
        currency: "EUR",
      }),
    });
  });

  it("returns 400 if name is missing", async () => {
    const request = createRequest("/api/accounts", {
      method: "POST",
      body: { type: "bank" },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("name");
  });

  it("returns 400 if name is empty string", async () => {
    const request = createRequest("/api/accounts", {
      method: "POST",
      body: { name: "  ", type: "bank" },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 if type is invalid", async () => {
    const request = createRequest("/api/accounts", {
      method: "POST",
      body: { name: "My Account", type: "savings" },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("type");
  });

  it("defaults to USD currency if not specified", async () => {
    const newAccount = createMockAccount({ currency: "USD" });
    mockAccountModel.create.mockResolvedValueOnce(newAccount);

    const request = createRequest("/api/accounts", {
      method: "POST",
      body: { name: "Test", type: "wallet" },
    });

    await POST(request);

    expect(mockAccountModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        currency: "USD",
      }),
    });
  });

  it("defaults to 0 balance if not specified", async () => {
    const newAccount = createMockAccount({ balance: 0 });
    mockAccountModel.create.mockResolvedValueOnce(newAccount);

    const request = createRequest("/api/accounts", {
      method: "POST",
      body: { name: "Test", type: "bank" },
    });

    await POST(request);

    expect(mockAccountModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        balance: 0,
      }),
    });
  });

  it("returns 403 for viewers in a space", async () => {
    vi.mocked(getSpaceContext).mockResolvedValueOnce({
      spaceId: "space-1",
      spaceName: "Family",
      role: "viewer",
    });

    const request = createRequest("/api/accounts", {
      method: "POST",
      body: { name: "Test", type: "bank" },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(403);
  });

  it("sets lowBalanceThreshold when provided", async () => {
    const newAccount = createMockAccount({ lowBalanceThreshold: 100 });
    mockAccountModel.create.mockResolvedValueOnce(newAccount);

    const request = createRequest("/api/accounts", {
      method: "POST",
      body: { name: "Test", type: "bank", lowBalanceThreshold: 100 },
    });

    await POST(request);

    expect(mockAccountModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lowBalanceThreshold: 100,
      }),
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValueOnce({
      user: null as never,
      error: true,
    });

    const request = createRequest("/api/accounts", {
      method: "POST",
      body: { name: "Test", type: "bank" },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });
});

describe("GET /api/accounts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns account when found", async () => {
    const account = createMockAccount({ id: "acc-1" });
    mockAccountModel.findFirst.mockResolvedValueOnce(account);

    const request = createRequest("/api/accounts/acc-1");
    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: "acc-1" }),
    });
    const { status, data } = await parseResponse<MockAccount>(response);

    expect(status).toBe(200);
    expect(data.id).toBe("acc-1");
  });

  it("returns 404 when not found", async () => {
    mockAccountModel.findFirst.mockResolvedValueOnce(null);

    const request = createRequest("/api/accounts/nonexistent");
    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });
});

describe("PATCH /api/accounts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates account with valid data", async () => {
    const existing = createMockAccount({ id: "acc-1" });
    const updated = { ...existing, name: "Updated Name" };
    mockAccountModel.findFirst.mockResolvedValueOnce(existing);
    mockAccountModel.update.mockResolvedValueOnce(updated);

    const request = createRequest("/api/accounts/acc-1", {
      method: "PATCH",
      body: { name: "Updated Name" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "acc-1" }),
    });
    const { status, data } = await parseResponse<MockAccount>(response);

    expect(status).toBe(200);
    expect(data.name).toBe("Updated Name");
  });

  it("returns 404 when account not found", async () => {
    mockAccountModel.findFirst.mockResolvedValueOnce(null);

    const request = createRequest("/api/accounts/nonexistent", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });

  it("returns 400 for invalid type", async () => {
    const existing = createMockAccount({ id: "acc-1" });
    mockAccountModel.findFirst.mockResolvedValueOnce(existing);

    const request = createRequest("/api/accounts/acc-1", {
      method: "PATCH",
      body: { type: "invalid" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "acc-1" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });
});

describe("DELETE /api/accounts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes account and returns 204", async () => {
    const existing = createMockAccount({ id: "acc-1" });
    mockAccountModel.findFirst.mockResolvedValueOnce(existing);
    mockAccountModel.delete.mockResolvedValueOnce(existing);

    const request = createRequest("/api/accounts/acc-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "acc-1" }),
    });

    expect(response.status).toBe(204);
    expect(mockAccountModel.delete).toHaveBeenCalledWith({
      where: { id: "acc-1" },
    });
  });

  it("returns 404 when account not found", async () => {
    mockAccountModel.findFirst.mockResolvedValueOnce(null);

    const request = createRequest("/api/accounts/nonexistent", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });
});

// Type helper for parseResponse
type MockAccount = ReturnType<typeof createMockAccount>;
