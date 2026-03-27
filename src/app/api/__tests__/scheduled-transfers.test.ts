/**
 * Integration tests for /api/scheduled-transfers routes.
 * Tests GET (list), POST (create), GET/PATCH/DELETE by ID.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAccount, createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockUser, mockScheduledTransferModel, mockAccountModel } = vi.hoisted(
  () => {
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
        name: "Test User",
        email: "test@example.com",
        reminderDays: null,
        baseCurrency: "USD",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
      mockScheduledTransferModel: createModel(),
      mockAccountModel: createModel(),
    };
  }
);

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue(mockUser),
}));

vi.mock("@/lib/schedule", () => ({
  calculateNextExecution: vi
    .fn()
    .mockReturnValue(new Date("2026-04-01T00:00:00Z")),
}));

vi.mock("@/lib/db", () => ({
  db: {
    scheduledTransfer: mockScheduledTransferModel,
    account: mockAccountModel,
  },
}));

// ── Import handlers after mocking ─────────────────────────────────────

import { GET, POST } from "../scheduled-transfers/route";
import {
  GET as GET_BY_ID,
  PATCH,
  DELETE,
} from "../scheduled-transfers/[id]/route";

// ── Helpers ───────────────────────────────────────────────────────────

function createMockSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: "sched-1",
    userId: "user-1",
    fromAccountId: "acc-1",
    toAccountId: "acc-2",
    amount: 100,
    currency: "USD",
    rateMode: "auto",
    manualRate: null,
    finalAmount: null,
    description: "Monthly savings",
    frequency: "monthly",
    interval: 1,
    dayOfWeek: null,
    dayOfMonth: 1,
    nextExecution: new Date("2026-04-01"),
    endDate: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    fromAccount: { id: "acc-1", name: "Checking", currency: "USD", color: null },
    toAccount: { id: "acc-2", name: "Savings", currency: "USD", color: null },
    ...overrides,
  };
}

function validPostBody(overrides: Record<string, unknown> = {}) {
  return {
    fromAccountId: "acc-1",
    toAccountId: "acc-2",
    amount: 100,
    frequency: "monthly",
    interval: 1,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("GET /api/scheduled-transfers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduledTransferModel.findMany.mockReset().mockResolvedValue([]);
  });

  it("returns all scheduled transfers for user", async () => {
    const schedules = [
      createMockSchedule({ id: "sched-1" }),
      createMockSchedule({ id: "sched-2", description: "Weekly grocery" }),
    ];
    mockScheduledTransferModel.findMany.mockResolvedValueOnce(schedules);

    const request = createRequest("/api/scheduled-transfers");
    const response = await GET(request);
    const { status, data } = await parseResponse<{
      schedules: unknown[];
      total: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.schedules).toHaveLength(2);
    expect(data.total).toBe(2);
  });

  it("filters by active=true", async () => {
    mockScheduledTransferModel.findMany.mockResolvedValueOnce([]);

    const request = createRequest(
      "/api/scheduled-transfers?active=true"
    );
    await GET(request);

    expect(mockScheduledTransferModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", isActive: true },
      })
    );
  });

  it("filters by active=false", async () => {
    mockScheduledTransferModel.findMany.mockResolvedValueOnce([]);

    const request = createRequest(
      "/api/scheduled-transfers?active=false"
    );
    await GET(request);

    expect(mockScheduledTransferModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", isActive: false },
      })
    );
  });
});

describe("POST /api/scheduled-transfers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset once-queues that clearAllMocks doesn't clear
    mockAccountModel.findFirst.mockReset().mockResolvedValue(null);
    mockScheduledTransferModel.create.mockReset().mockResolvedValue(null);
    mockScheduledTransferModel.findMany.mockReset().mockResolvedValue([]);
  });

  it("creates a scheduled transfer with valid data", async () => {
    const fromAcc = createMockAccount({ id: "acc-1", currency: "USD" });
    const toAcc = createMockAccount({ id: "acc-2", currency: "EUR" });
    mockAccountModel.findFirst
      .mockResolvedValueOnce(fromAcc)
      .mockResolvedValueOnce(toAcc);

    const created = createMockSchedule();
    mockScheduledTransferModel.create.mockResolvedValueOnce(created);

    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody(),
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ id: string }>(response);

    expect(status).toBe(201);
    expect(data.id).toBe("sched-1");
    expect(mockScheduledTransferModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          fromAccountId: "acc-1",
          toAccountId: "acc-2",
          amount: 100,
          frequency: "monthly",
        }),
      })
    );
  });

  it("returns 400 if accounts are missing", async () => {
    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: { amount: 100, frequency: "monthly" },
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 if source equals destination", async () => {
    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody({ fromAccountId: "acc-1", toAccountId: "acc-1" }),
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("different");
  });

  it("returns 400 if amount is not positive", async () => {
    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody({ amount: -10 }),
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 if amount is zero", async () => {
    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody({ amount: 0 }),
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 for invalid frequency", async () => {
    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody({ frequency: "biweekly" }),
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("Frequency");
  });

  it("returns 400 for invalid rate mode", async () => {
    // No account mocks needed — validation fails before DB lookup
    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody({ rateMode: "invalid" }),
    });
    const response = await POST(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 if manual rate mode lacks rate", async () => {
    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody({ rateMode: "manual" }),
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("Manual rate");
  });

  it("returns 400 if final mode lacks finalAmount", async () => {
    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody({ rateMode: "final" }),
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("Final amount");
  });

  it("returns 404 if source account not found", async () => {
    mockAccountModel.findFirst.mockResolvedValueOnce(null); // source not found

    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody(),
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(404);
    expect(data.error).toContain("Source");
  });

  it("returns 404 if destination account not found", async () => {
    const fromAcc = createMockAccount({ id: "acc-1" });
    mockAccountModel.findFirst
      .mockResolvedValueOnce(fromAcc)
      .mockResolvedValueOnce(null); // destination not found

    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody(),
    });
    const response = await POST(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(404);
    expect(data.error).toContain("Destination");
  });

  it("defaults rate mode to auto", async () => {
    const fromAcc = createMockAccount({ id: "acc-1", currency: "USD" });
    const toAcc = createMockAccount({ id: "acc-2", currency: "EUR" });
    mockAccountModel.findFirst
      .mockResolvedValueOnce(fromAcc)
      .mockResolvedValueOnce(toAcc);
    mockScheduledTransferModel.create.mockResolvedValueOnce(
      createMockSchedule()
    );

    const request = createRequest("/api/scheduled-transfers", {
      method: "POST",
      body: validPostBody(), // no rateMode specified
    });
    await POST(request);

    expect(mockScheduledTransferModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rateMode: "auto",
          manualRate: null,
          finalAmount: null,
        }),
      })
    );
  });
});

describe("GET /api/scheduled-transfers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduledTransferModel.findFirst.mockReset().mockResolvedValue(null);
  });

  it("returns scheduled transfer when found", async () => {
    const schedule = createMockSchedule({ id: "sched-1" });
    mockScheduledTransferModel.findFirst.mockResolvedValueOnce(schedule);

    const request = createRequest("/api/scheduled-transfers/sched-1");
    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: "sched-1" }),
    });
    const { status, data } = await parseResponse<{ id: string }>(response);

    expect(status).toBe(200);
    expect(data.id).toBe("sched-1");
  });

  it("returns 404 when not found", async () => {
    mockScheduledTransferModel.findFirst.mockResolvedValueOnce(null);

    const request = createRequest("/api/scheduled-transfers/nonexistent");
    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });
});

describe("PATCH /api/scheduled-transfers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduledTransferModel.findFirst.mockReset().mockResolvedValue(null);
    mockScheduledTransferModel.update.mockReset().mockResolvedValue(null);
    mockAccountModel.findFirst.mockReset().mockResolvedValue(null);
  });

  it("updates amount and description", async () => {
    const existing = createMockSchedule({ id: "sched-1" });
    const updated = { ...existing, amount: 200, description: "Updated" };
    mockScheduledTransferModel.findFirst.mockResolvedValueOnce(existing);
    mockScheduledTransferModel.update.mockResolvedValueOnce(updated);

    const request = createRequest("/api/scheduled-transfers/sched-1", {
      method: "PATCH",
      body: { amount: 200, description: "Updated" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "sched-1" }),
    });
    const { status, data } = await parseResponse<{
      amount: number;
      description: string;
    }>(response);

    expect(status).toBe(200);
    expect(data.amount).toBe(200);
    expect(data.description).toBe("Updated");
  });

  it("toggles isActive", async () => {
    const existing = createMockSchedule({ id: "sched-1", isActive: true });
    const updated = { ...existing, isActive: false };
    mockScheduledTransferModel.findFirst.mockResolvedValueOnce(existing);
    mockScheduledTransferModel.update.mockResolvedValueOnce(updated);

    const request = createRequest("/api/scheduled-transfers/sched-1", {
      method: "PATCH",
      body: { isActive: false },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "sched-1" }),
    });
    const { status, data } = await parseResponse<{ isActive: boolean }>(
      response
    );

    expect(status).toBe(200);
    expect(data.isActive).toBe(false);
  });

  it("returns 404 when schedule not found", async () => {
    mockScheduledTransferModel.findFirst.mockResolvedValueOnce(null);

    const request = createRequest("/api/scheduled-transfers/nonexistent", {
      method: "PATCH",
      body: { amount: 200 },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });

  it("returns 400 if updated accounts are the same", async () => {
    const existing = createMockSchedule({
      id: "sched-1",
      fromAccountId: "acc-1",
      toAccountId: "acc-2",
    });
    mockScheduledTransferModel.findFirst.mockResolvedValueOnce(existing);

    // Update toAccountId to match fromAccountId
    const acc = createMockAccount({ id: "acc-1" });
    mockAccountModel.findFirst.mockResolvedValueOnce(acc);

    const request = createRequest("/api/scheduled-transfers/sched-1", {
      method: "PATCH",
      body: { toAccountId: "acc-1" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "sched-1" }),
    });
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("different");
  });

  it("returns 404 if new source account not found", async () => {
    const existing = createMockSchedule({ id: "sched-1" });
    mockScheduledTransferModel.findFirst.mockResolvedValueOnce(existing);
    mockAccountModel.findFirst.mockResolvedValueOnce(null); // account not found

    const request = createRequest("/api/scheduled-transfers/sched-1", {
      method: "PATCH",
      body: { fromAccountId: "nonexistent" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "sched-1" }),
    });
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(404);
    expect(data.error).toContain("Source");
  });

  it("returns 400 for invalid rate mode", async () => {
    const existing = createMockSchedule({ id: "sched-1" });
    mockScheduledTransferModel.findFirst.mockResolvedValueOnce(existing);

    const request = createRequest("/api/scheduled-transfers/sched-1", {
      method: "PATCH",
      body: { rateMode: "invalid" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "sched-1" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });
});

describe("DELETE /api/scheduled-transfers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduledTransferModel.findFirst.mockReset().mockResolvedValue(null);
    mockScheduledTransferModel.delete.mockReset().mockResolvedValue(null);
  });

  it("deletes scheduled transfer", async () => {
    const existing = createMockSchedule({ id: "sched-1" });
    mockScheduledTransferModel.findFirst.mockResolvedValueOnce(existing);
    mockScheduledTransferModel.delete.mockResolvedValueOnce(existing);

    const request = createRequest("/api/scheduled-transfers/sched-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "sched-1" }),
    });
    const { status, data } = await parseResponse<{ success: boolean }>(
      response
    );

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockScheduledTransferModel.delete).toHaveBeenCalledWith({
      where: { id: "sched-1" },
    });
  });

  it("returns 404 when not found", async () => {
    mockScheduledTransferModel.findFirst.mockResolvedValueOnce(null);

    const request = createRequest("/api/scheduled-transfers/nonexistent", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });
});
