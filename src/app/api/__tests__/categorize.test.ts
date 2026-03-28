/**
 * Integration tests for /api/categorize and /api/categorize/feedback routes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const {
  mockUser,
  mockCategoryModel,
  mockCategoryCorrectionModel,
  mockCategorizeTransaction,
  mockFindSimilar,
  mockNormalizeName,
} = vi.hoisted(() => {
  const createModel = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
  });

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
    mockCategoryModel: createModel(),
    mockCategoryCorrectionModel: createModel(),
    mockCategorizeTransaction: vi.fn().mockResolvedValue({
      categoryId: "cat-1",
      suggestedName: "Food & Dining",
      confidence: 0.9,
      isNew: false,
    }),
    mockFindSimilar: vi.fn().mockReturnValue(null),
    mockNormalizeName: vi.fn((name: string) => name.trim().toLowerCase()),
  };
});

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    category: mockCategoryModel,
    categoryCorrection: mockCategoryCorrectionModel,
  },
}));

vi.mock("@/lib/categorize", () => ({
  categorizeTransaction: mockCategorizeTransaction,
}));

vi.mock("@/lib/category-normalize", () => ({
  findSimilar: mockFindSimilar,
  normalizeName: mockNormalizeName,
}));

// ── Import handlers after mocking ────────────────────────────────────────

import { POST as categorizePOST } from "../categorize/route";
import { POST as feedbackPOST } from "../categorize/feedback/route";

// ── Tests ────────────────────────────────────────────────────────────────

describe("POST /api/categorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user has some categories
    mockCategoryModel.findMany.mockResolvedValue([
      { id: "cat-1", name: "Food & Dining" },
      { id: "cat-2", name: "Transport" },
    ]);
    mockCategoryCorrectionModel.findMany.mockResolvedValue([]);
  });

  it("returns AI categorization result for valid description", async () => {
    const req = createRequest("http://localhost:3000/api/categorize", {
      method: "POST",
      body: { description: "Coffee at Starbucks", amount: 5.5 },
    });

    const res = await categorizePOST(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toEqual({
      categoryId: "cat-1",
      suggestedName: "Food & Dining",
      confidence: 0.9,
      isNew: false,
    });
    expect(mockCategorizeTransaction).toHaveBeenCalledWith(
      "Coffee at Starbucks",
      expect.any(Array),
      5.5,
      undefined
    );
  });

  it("returns 400 for missing description", async () => {
    const req = createRequest("http://localhost:3000/api/categorize", {
      method: "POST",
      body: { amount: 5 },
    });

    const res = await categorizePOST(req);
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(400);
    expect(data.error).toContain("Description is required");
  });

  it("returns 400 for empty description", async () => {
    const req = createRequest("http://localhost:3000/api/categorize", {
      method: "POST",
      body: { description: "   " },
    });

    const res = await categorizePOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("seeds default categories when user has none", async () => {
    // First call returns empty (no categories), second call returns seeded
    mockCategoryModel.findMany
      .mockResolvedValueOnce([]) // initial check
      .mockResolvedValueOnce([
        { id: "cat-new-1", name: "Food & Dining" },
        { id: "cat-new-2", name: "Transport" },
      ]);

    const req = createRequest("http://localhost:3000/api/categorize", {
      method: "POST",
      body: { description: "Groceries" },
    });

    await categorizePOST(req);

    expect(mockCategoryModel.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "user-1", name: "Food & Dining" }),
        ]),
      })
    );
  });

  it("creates new category when AI suggests a new one", async () => {
    mockCategorizeTransaction.mockResolvedValueOnce({
      categoryId: null,
      suggestedName: "Pet Care",
      confidence: 0.7,
      isNew: true,
    });
    mockFindSimilar.mockReturnValueOnce(null);
    mockNormalizeName.mockReturnValueOnce("pet care");
    mockCategoryModel.create.mockResolvedValueOnce({
      id: "cat-new",
      name: "pet care",
    });

    const req = createRequest("http://localhost:3000/api/categorize", {
      method: "POST",
      body: { description: "Dog food" },
    });

    const res = await categorizePOST(req);
    const { status, data } = await parseResponse<{ categoryId: string; isNew: boolean }>(res);

    expect(status).toBe(200);
    expect(data.categoryId).toBe("cat-new");
    expect(mockCategoryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", name: "pet care" }),
      })
    );
  });

  it("uses existing similar category instead of creating duplicate", async () => {
    mockCategorizeTransaction.mockResolvedValueOnce({
      categoryId: null,
      suggestedName: "Food",
      confidence: 0.7,
      isNew: true,
    });
    mockFindSimilar.mockReturnValueOnce({ id: "cat-1", name: "Food & Dining" });

    const req = createRequest("http://localhost:3000/api/categorize", {
      method: "POST",
      body: { description: "Lunch" },
    });

    const res = await categorizePOST(req);
    const { status, data } = await parseResponse<{ categoryId: string; isNew: boolean }>(res);

    expect(status).toBe(200);
    expect(data.categoryId).toBe("cat-1");
    expect(data.isNew).toBe(false);
    expect(mockCategoryModel.create).not.toHaveBeenCalled();
  });

  it("passes corrections to AI when available", async () => {
    const corrections = [
      { id: "corr-1", description: "uber", suggestedCategoryId: "cat-1", correctedCategoryId: "cat-2" },
    ];
    mockCategoryCorrectionModel.findMany.mockResolvedValueOnce(corrections);

    const req = createRequest("http://localhost:3000/api/categorize", {
      method: "POST",
      body: { description: "Uber ride" },
    });

    await categorizePOST(req);

    expect(mockCategorizeTransaction).toHaveBeenCalledWith(
      "Uber ride",
      expect.any(Array),
      undefined,
      corrections
    );
  });

  it("returns 401 for unauthenticated requests", async () => {
    const { requireApiUser } = await import("@/lib/auth");
    vi.mocked(requireApiUser).mockResolvedValueOnce({
      user: null as never,
      error: true,
    });

    const req = createRequest("http://localhost:3000/api/categorize", {
      method: "POST",
      body: { description: "test" },
    });

    const res = await categorizePOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});

describe("POST /api/categorize/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoryCorrectionModel.create.mockResolvedValue({
      id: "corr-1",
      userId: "user-1",
      description: "test",
      suggestedCategoryId: "cat-1",
      correctedCategoryId: "cat-2",
    });
  });

  it("stores correction when user changes category", async () => {
    const req = createRequest("http://localhost:3000/api/categorize/feedback", {
      method: "POST",
      body: {
        description: "Uber ride",
        suggestedCategoryId: "cat-1",
        correctedCategoryId: "cat-2",
      },
    });

    const res = await feedbackPOST(req);
    const { status, data } = await parseResponse<{ stored: boolean; id: string }>(res);

    expect(status).toBe(200);
    expect(data.stored).toBe(true);
    expect(data.id).toBe("corr-1");
    expect(mockCategoryCorrectionModel.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        description: "Uber ride",
        suggestedCategoryId: "cat-1",
        correctedCategoryId: "cat-2",
      },
    });
  });

  it("skips storage when no correction needed (same category)", async () => {
    const req = createRequest("http://localhost:3000/api/categorize/feedback", {
      method: "POST",
      body: {
        description: "Coffee",
        suggestedCategoryId: "cat-1",
        correctedCategoryId: "cat-1",
      },
    });

    const res = await feedbackPOST(req);
    const { status, data } = await parseResponse<{ stored: boolean; reason: string }>(res);

    expect(status).toBe(200);
    expect(data.stored).toBe(false);
    expect(data.reason).toBe("no correction needed");
    expect(mockCategoryCorrectionModel.create).not.toHaveBeenCalled();
  });

  it("returns 400 for missing description", async () => {
    const req = createRequest("http://localhost:3000/api/categorize/feedback", {
      method: "POST",
      body: { suggestedCategoryId: "cat-1", correctedCategoryId: "cat-2" },
    });

    const res = await feedbackPOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("returns 400 for missing correctedCategoryId", async () => {
    const req = createRequest("http://localhost:3000/api/categorize/feedback", {
      method: "POST",
      body: { description: "test", suggestedCategoryId: "cat-1" },
    });

    const res = await feedbackPOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("handles null suggestedCategoryId", async () => {
    const req = createRequest("http://localhost:3000/api/categorize/feedback", {
      method: "POST",
      body: {
        description: "new item",
        suggestedCategoryId: null,
        correctedCategoryId: "cat-2",
      },
    });

    const res = await feedbackPOST(req);
    const { status, data } = await parseResponse<{ stored: boolean }>(res);

    expect(status).toBe(200);
    expect(data.stored).toBe(true);
    expect(mockCategoryCorrectionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ suggestedCategoryId: null }),
      })
    );
  });

  it("returns 401 for unauthenticated requests", async () => {
    const { requireApiUser } = await import("@/lib/auth");
    vi.mocked(requireApiUser).mockResolvedValueOnce({
      user: null as never,
      error: true,
    });

    const req = createRequest("http://localhost:3000/api/categorize/feedback", {
      method: "POST",
      body: {
        description: "test",
        suggestedCategoryId: "cat-1",
        correctedCategoryId: "cat-2",
      },
    });

    const res = await feedbackPOST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});
