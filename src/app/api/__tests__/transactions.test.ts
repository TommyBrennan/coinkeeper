/**
 * Integration tests for /api/transactions routes.
 * Tests GET (list with filters) and POST (create with balance updates).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockAccount,
  createMockTransaction,
  createRequest,
  parseResponse,
} from "./helpers";

// ── Hoisted mocks ─────────────────────────────────────────────────────────

const {
  mockUser,
  mockTransactionModel,
  mockAccountModel,
  mockRecurringRuleModel,
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
    mockUser: {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    mockTransactionModel: createModel(),
    mockAccountModel: createModel(),
    mockRecurringRuleModel: createModel(),
    mockDbTransaction: vi.fn().mockImplementation(async (cb: (...args: unknown[]) => unknown) => {
      const tx = {
        transaction: { create: vi.fn() },
        account: { update: vi.fn() },
      };
      return cb(tx);
    }),
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
  checkSpacePermission: vi
    .fn()
    .mockResolvedValue({ allowed: true, role: "owner" }),
  getSpaceAccountIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/check-low-balance", () => ({
  checkLowBalance: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/check-unusual-spending", () => ({
  checkUnusualSpending: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    transaction: mockTransactionModel,
    account: mockAccountModel,
    recurringRule: mockRecurringRuleModel,
    $transaction: mockDbTransaction,
  },
}));

// ── Import handlers after mocking ─────────────────────────────────────────

import { GET, POST } from "../transactions/route";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext, checkSpacePermission } from "@/lib/space-context";

// ── Tests ─────────────────────────────────────────────────────────────────

describe("GET /api/transactions", () => {
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

  it("returns transactions for authenticated user", async () => {
    const transactions = [createMockTransaction()];
    mockTransactionModel.findMany.mockResolvedValueOnce(transactions);
    mockTransactionModel.count.mockResolvedValueOnce(1);

    const request = createRequest("/api/transactions");
    const response = await GET(request);
    const { status, data } = await parseResponse<{
      transactions: unknown[];
      total: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.transactions).toHaveLength(1);
    expect(data.total).toBe(1);
  });

  it("applies type filter", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([]);
    mockTransactionModel.count.mockResolvedValueOnce(0);

    const request = createRequest("/api/transactions?type=expense");
    await GET(request);

    expect(mockTransactionModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "expense" }),
      })
    );
  });

  it("applies date range filters", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([]);
    mockTransactionModel.count.mockResolvedValueOnce(0);

    const request = createRequest(
      "/api/transactions?from=2026-01-01&to=2026-03-31"
    );
    await GET(request);

    expect(mockTransactionModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: new Date("2026-01-01"),
            lte: new Date("2026-03-31"),
          },
        }),
      })
    );
  });

  it("respects limit and offset parameters", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([]);
    mockTransactionModel.count.mockResolvedValueOnce(0);

    const request = createRequest("/api/transactions?limit=10&offset=20");
    await GET(request);

    expect(mockTransactionModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      })
    );
  });

  it("defaults to limit 50 offset 0", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([]);
    mockTransactionModel.count.mockResolvedValueOnce(0);

    const request = createRequest("/api/transactions");
    await GET(request);

    expect(mockTransactionModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        skip: 0,
      })
    );
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValueOnce({
      user: null as never,
      error: true,
    });

    const request = createRequest("/api/transactions");
    const response = await GET(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });
});

describe("POST /api/transactions", () => {
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

    // Default: account exists and belongs to user
    mockAccountModel.findFirst.mockImplementation(
      async ({ where }: { where: { id: string } }) => {
        return createMockAccount({ id: where.id, userId: "user-1" });
      }
    );

    // Mock $transaction to create transaction and return it
    mockDbTransaction.mockImplementation(async (cb: (...args: unknown[]) => unknown) => {
      const txn = createMockTransaction();
      const tx = {
        transaction: { create: vi.fn().mockResolvedValue(txn) },
        account: { update: vi.fn().mockResolvedValue({}) },
      };
      return cb(tx);
    });
  });

  it("creates an expense transaction", async () => {
    const request = createRequest("/api/transactions", {
      method: "POST",
      body: {
        type: "expense",
        amount: 25.5,
        currency: "USD",
        description: "Lunch",
        fromAccountId: "acc-1",
      },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(201);
    expect(mockDbTransaction).toHaveBeenCalled();
  });

  it("creates an income transaction", async () => {
    const request = createRequest("/api/transactions", {
      method: "POST",
      body: {
        type: "income",
        amount: 3000,
        currency: "USD",
        description: "Salary",
        toAccountId: "acc-1",
      },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(201);
  });

  it("returns 400 if type is invalid", async () => {
    const request = createRequest("/api/transactions", {
      method: "POST",
      body: { type: "refund", amount: 10, fromAccountId: "acc-1" },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("Type");
  });

  it("returns 400 if amount is missing", async () => {
    const request = createRequest("/api/transactions", {
      method: "POST",
      body: { type: "expense", fromAccountId: "acc-1" },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 if amount is zero", async () => {
    const request = createRequest("/api/transactions", {
      method: "POST",
      body: { type: "expense", amount: 0, fromAccountId: "acc-1" },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 if amount is negative", async () => {
    const request = createRequest("/api/transactions", {
      method: "POST",
      body: { type: "expense", amount: -10, fromAccountId: "acc-1" },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 if expense has no fromAccountId", async () => {
    const request = createRequest("/api/transactions", {
      method: "POST",
      body: { type: "expense", amount: 25 },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("source account");
  });

  it("returns 400 if income has no toAccountId", async () => {
    const request = createRequest("/api/transactions", {
      method: "POST",
      body: { type: "income", amount: 100 },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("destination account");
  });

  it("returns 400 if transfer has no fromAccountId", async () => {
    const request = createRequest("/api/transactions", {
      method: "POST",
      body: { type: "transfer", amount: 50, toAccountId: "acc-2" },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 if transfer source equals destination", async () => {
    const request = createRequest("/api/transactions", {
      method: "POST",
      body: {
        type: "transfer",
        amount: 50,
        fromAccountId: "acc-1",
        toAccountId: "acc-1",
      },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("different");
  });

  it("returns 404 if source account does not exist", async () => {
    mockAccountModel.findFirst.mockResolvedValueOnce(null);

    const request = createRequest("/api/transactions", {
      method: "POST",
      body: { type: "expense", amount: 25, fromAccountId: "nonexistent" },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });

  it("returns 404 if source account belongs to another user", async () => {
    mockAccountModel.findFirst.mockResolvedValueOnce(
      createMockAccount({ id: "acc-other", userId: "other-user" })
    );

    const request = createRequest("/api/transactions", {
      method: "POST",
      body: { type: "expense", amount: 25, fromAccountId: "acc-other" },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });

  it("returns 403 for viewers in a space", async () => {
    vi.mocked(getSpaceContext).mockResolvedValueOnce({
      spaceId: "space-1",
      spaceName: "Family",
      role: "editor",
    });
    vi.mocked(checkSpacePermission).mockResolvedValueOnce({
      allowed: false,
      role: "viewer",
    });

    const request = createRequest("/api/transactions", {
      method: "POST",
      body: {
        type: "expense",
        amount: 25,
        fromAccountId: "acc-1",
      },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(403);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValueOnce({
      user: null as never,
      error: true,
    });

    const request = createRequest("/api/transactions", {
      method: "POST",
      body: { type: "expense", amount: 25, fromAccountId: "acc-1" },
    });

    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });
});
