/**
 * Integration tests for /api/receipts routes.
 * Tests user ownership enforcement on receipt CRUD operations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createRequest,
  parseResponse,
} from "./helpers";

// ── Hoisted mocks ──

const { mockUser, mockReceiptModel, mockTransactionModel } = vi.hoisted(() => {
  return {
    mockUser: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      reminderDays: null,
      baseCurrency: "USD",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    mockReceiptModel: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
    mockTransactionModel: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
});

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue(mockUser),
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
}));

vi.mock("@/lib/db", () => ({
  db: {
    receipt: mockReceiptModel,
    transaction: mockTransactionModel,
  },
}));

// ── Tests ──

describe("GET /api/receipts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters receipts by current user's ID", async () => {
    const mockReceipts = [
      {
        id: "rec-1",
        userId: "user-1",
        imagePath: "/uploads/receipts/test.jpg",
        merchant: "Test Store",
        total: 42.5,
        currency: "USD",
        createdAt: new Date("2026-03-01"),
        transactions: [],
      },
    ];
    mockReceiptModel.findMany.mockResolvedValueOnce(mockReceipts);
    mockReceiptModel.count.mockResolvedValueOnce(1);

    const { GET } = await import("../receipts/route");
    const request = createRequest("http://localhost:3000/api/receipts");
    const response = await GET(request);
    const { status, data } = await parseResponse<{
      receipts: unknown[];
      total: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.receipts).toHaveLength(1);

    // Verify findMany was called with userId filter
    expect(mockReceiptModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
      })
    );

    // Verify count was also scoped to user
    expect(mockReceiptModel.count).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("respects limit and offset params", async () => {
    mockReceiptModel.findMany.mockResolvedValueOnce([]);
    mockReceiptModel.count.mockResolvedValueOnce(0);

    const { GET } = await import("../receipts/route");
    const request = createRequest(
      "http://localhost:3000/api/receipts?limit=5&offset=10"
    );
    await GET(request);

    expect(mockReceiptModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        skip: 10,
        where: { userId: "user-1" },
      })
    );
  });
});

describe("GET /api/receipts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns receipt when owned by current user", async () => {
    const mockReceipt = {
      id: "rec-1",
      userId: "user-1",
      imagePath: "/uploads/receipts/test.jpg",
      merchant: "Test Store",
      total: 42.5,
      currency: "USD",
      parsedData: null,
      createdAt: new Date("2026-03-01"),
      transactions: [],
    };
    mockReceiptModel.findUnique.mockResolvedValueOnce(mockReceipt);

    const { GET } = await import("../receipts/[id]/route");
    const request = createRequest("http://localhost:3000/api/receipts/rec-1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "rec-1" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
    expect(mockReceiptModel.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rec-1", userId: "user-1" },
      })
    );
  });

  it("returns 404 when receipt belongs to another user", async () => {
    // findUnique with userId filter returns null for another user's receipt
    mockReceiptModel.findUnique.mockResolvedValueOnce(null);

    const { GET } = await import("../receipts/[id]/route");
    const request = createRequest(
      "http://localhost:3000/api/receipts/rec-other"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "rec-other" }),
    });
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Receipt not found");
  });
});

describe("DELETE /api/receipts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes receipt when owned by current user", async () => {
    const mockReceipt = {
      id: "rec-1",
      userId: "user-1",
      imagePath: "/uploads/receipts/test.jpg",
    };
    mockReceiptModel.findUnique.mockResolvedValueOnce(mockReceipt);
    mockReceiptModel.delete.mockResolvedValueOnce(mockReceipt);

    const { DELETE } = await import("../receipts/[id]/route");
    const request = createRequest("http://localhost:3000/api/receipts/rec-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "rec-1" }),
    });
    const { status, data } = await parseResponse<{ success: boolean }>(
      response
    );

    expect(status).toBe(200);
    expect(data.success).toBe(true);

    // Verify ownership check in findUnique
    expect(mockReceiptModel.findUnique).toHaveBeenCalledWith({
      where: { id: "rec-1", userId: "user-1" },
    });

    // Verify delete also scoped to user
    expect(mockReceiptModel.delete).toHaveBeenCalledWith({
      where: { id: "rec-1", userId: "user-1" },
    });
  });

  it("returns 404 when deleting another user's receipt", async () => {
    mockReceiptModel.findUnique.mockResolvedValueOnce(null);

    const { DELETE } = await import("../receipts/[id]/route");
    const request = createRequest(
      "http://localhost:3000/api/receipts/rec-other",
      { method: "DELETE" }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "rec-other" }),
    });
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Receipt not found");
  });
});
