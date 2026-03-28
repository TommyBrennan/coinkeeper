/**
 * Integration tests for /api/notifications routes.
 * Tests GET (list), POST (mark-all-read), PATCH (update), DELETE, and check triggers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockUser,
  mockNotificationModel,
  mockCheckLowBalances,
  mockCheckReminder,
  mockCheckSpending,
} = vi.hoisted(() => {
  const createModel = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
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
    mockNotificationModel: createModel(),
    mockCheckLowBalances: vi.fn().mockResolvedValue(0),
    mockCheckReminder: vi.fn().mockResolvedValue(false),
    mockCheckSpending: vi.fn().mockResolvedValue(0),
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
    notification: mockNotificationModel,
  },
}));

vi.mock("@/lib/check-low-balance", () => ({
  checkAllLowBalances: mockCheckLowBalances,
}));

vi.mock("@/lib/check-expense-reminders", () => ({
  checkExpenseReminder: mockCheckReminder,
}));

vi.mock("@/lib/check-unusual-spending", () => ({
  checkRecentSpendingAnomalies: mockCheckSpending,
}));

// ── Import handlers after mocking ────────────────────────────────────────────

import { GET, POST } from "../notifications/route";
import {
  PATCH as PATCH_BY_ID,
  DELETE as DELETE_BY_ID,
} from "../notifications/[id]/route";
import { POST as CHECK_BALANCE } from "../notifications/check-balance/route";
import { POST as CHECK_REMINDERS } from "../notifications/check-reminders/route";
import { POST as CHECK_SPENDING } from "../notifications/check-spending/route";
import { requireApiUser } from "@/lib/auth";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: "notif-1",
    userId: "user-1",
    spaceId: null,
    type: "low_balance",
    title: "Low Balance Warning",
    message: "Account 'Checking' balance is below $100",
    read: false,
    data: null,
    createdAt: new Date("2026-03-28"),
    updatedAt: new Date("2026-03-28"),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Reset auth to default (authenticated)
  vi.mocked(requireApiUser).mockResolvedValue({
    user: mockUser,
    error: false,
  } as never);
});

describe("GET /api/notifications — list notifications", () => {
  it("returns paginated notifications with counts", async () => {
    const notifs = [
      createMockNotification({ id: "notif-1" }),
      createMockNotification({ id: "notif-2", read: true }),
    ];
    mockNotificationModel.findMany.mockResolvedValue(notifs);
    mockNotificationModel.count
      .mockResolvedValueOnce(2) // total
      .mockResolvedValueOnce(1); // unreadCount

    const req = createRequest("http://localhost:3000/api/notifications");
    const res = await GET(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toHaveProperty("notifications");
    expect(data).toHaveProperty("total", 2);
    expect(data).toHaveProperty("unreadCount", 1);
    expect((data as { notifications: unknown[] }).notifications).toHaveLength(2);
  });

  it("filters unread only when param is set", async () => {
    mockNotificationModel.findMany.mockResolvedValue([]);
    mockNotificationModel.count.mockResolvedValue(0);

    const req = createRequest(
      "http://localhost:3000/api/notifications?unreadOnly=true"
    );
    await GET(req);

    const findManyCall = mockNotificationModel.findMany.mock.calls[0][0];
    expect(findManyCall.where).toHaveProperty("read", false);
  });

  it("respects limit and offset params", async () => {
    mockNotificationModel.findMany.mockResolvedValue([]);
    mockNotificationModel.count.mockResolvedValue(0);

    const req = createRequest(
      "http://localhost:3000/api/notifications?limit=10&offset=5"
    );
    await GET(req);

    const findManyCall = mockNotificationModel.findMany.mock.calls[0][0];
    expect(findManyCall.take).toBe(10);
    expect(findManyCall.skip).toBe(5);
  });

  it("caps limit at 100", async () => {
    mockNotificationModel.findMany.mockResolvedValue([]);
    mockNotificationModel.count.mockResolvedValue(0);

    const req = createRequest(
      "http://localhost:3000/api/notifications?limit=500"
    );
    await GET(req);

    const findManyCall = mockNotificationModel.findMany.mock.calls[0][0];
    expect(findManyCall.take).toBe(100);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null,
      error: true,
    } as never);

    const req = createRequest("http://localhost:3000/api/notifications");
    const res = await GET(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});

describe("POST /api/notifications — mark all read", () => {
  it("marks all notifications as read", async () => {
    mockNotificationModel.updateMany.mockResolvedValue({ count: 3 });

    const req = createRequest("http://localhost:3000/api/notifications", {
      method: "POST",
      body: { action: "mark-all-read" },
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toHaveProperty("success", true);
    expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          read: false,
        }),
        data: { read: true },
      })
    );
  });

  it("returns 400 for invalid action", async () => {
    const req = createRequest("http://localhost:3000/api/notifications", {
      method: "POST",
      body: { action: "invalid" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null,
      error: true,
    } as never);

    const req = createRequest("http://localhost:3000/api/notifications", {
      method: "POST",
      body: { action: "mark-all-read" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});

describe("PATCH /api/notifications/[id] — update notification", () => {
  it("marks a notification as read", async () => {
    const notif = createMockNotification();
    mockNotificationModel.findFirst.mockResolvedValue(notif);
    mockNotificationModel.update.mockResolvedValue({ ...notif, read: true });

    const req = createRequest(
      "http://localhost:3000/api/notifications/notif-1",
      {
        method: "PATCH",
        body: { read: true },
      }
    );
    const res = await PATCH_BY_ID(req, {
      params: Promise.resolve({ id: "notif-1" }),
    });
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toHaveProperty("notification");
    expect(mockNotificationModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notif-1" },
        data: { read: true },
      })
    );
  });

  it("returns 404 for notification owned by another user", async () => {
    mockNotificationModel.findFirst.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost:3000/api/notifications/notif-other",
      {
        method: "PATCH",
        body: { read: true },
      }
    );
    const res = await PATCH_BY_ID(req, {
      params: Promise.resolve({ id: "notif-other" }),
    });
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });

  it("returns 400 for invalid body (missing read field)", async () => {
    const req = createRequest(
      "http://localhost:3000/api/notifications/notif-1",
      {
        method: "PATCH",
        body: { foo: "bar" },
      }
    );
    const res = await PATCH_BY_ID(req, {
      params: Promise.resolve({ id: "notif-1" }),
    });
    const { status, data } = await parseResponse(res);

    expect(status).toBe(400);
    expect(data).toHaveProperty("error", "Validation failed");
    expect(data).toHaveProperty("details");
  });

  it("returns 400 for invalid body (read is not boolean)", async () => {
    const req = createRequest(
      "http://localhost:3000/api/notifications/notif-1",
      {
        method: "PATCH",
        body: { read: "yes" },
      }
    );
    const res = await PATCH_BY_ID(req, {
      params: Promise.resolve({ id: "notif-1" }),
    });
    const { status, data } = await parseResponse(res);

    expect(status).toBe(400);
    expect(data).toHaveProperty("error", "Validation failed");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null,
      error: true,
    } as never);

    const req = createRequest(
      "http://localhost:3000/api/notifications/notif-1",
      {
        method: "PATCH",
        body: { read: true },
      }
    );
    const res = await PATCH_BY_ID(req, {
      params: Promise.resolve({ id: "notif-1" }),
    });
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});

describe("DELETE /api/notifications/[id] — delete notification", () => {
  it("deletes a notification owned by the user", async () => {
    const notif = createMockNotification();
    mockNotificationModel.findFirst.mockResolvedValue(notif);
    mockNotificationModel.delete.mockResolvedValue(notif);

    const req = createRequest(
      "http://localhost:3000/api/notifications/notif-1",
      { method: "DELETE" }
    );
    const res = await DELETE_BY_ID(req, {
      params: Promise.resolve({ id: "notif-1" }),
    });
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toHaveProperty("success", true);
    expect(mockNotificationModel.delete).toHaveBeenCalledWith({
      where: { id: "notif-1" },
    });
  });

  it("returns 404 for nonexistent notification", async () => {
    mockNotificationModel.findFirst.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost:3000/api/notifications/notif-missing",
      { method: "DELETE" }
    );
    const res = await DELETE_BY_ID(req, {
      params: Promise.resolve({ id: "notif-missing" }),
    });
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null,
      error: true,
    } as never);

    const req = createRequest(
      "http://localhost:3000/api/notifications/notif-1",
      { method: "DELETE" }
    );
    const res = await DELETE_BY_ID(req, {
      params: Promise.resolve({ id: "notif-1" }),
    });
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});

describe("POST /api/notifications/check-balance — trigger low balance check", () => {
  it("calls checkAllLowBalances and returns result", async () => {
    mockCheckLowBalances.mockResolvedValue(2);

    const res = await CHECK_BALANCE();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toEqual({ checked: true, notificationsCreated: 2 });
    expect(mockCheckLowBalances).toHaveBeenCalledWith("user-1");
  });

  it("returns 0 when no low balances detected", async () => {
    mockCheckLowBalances.mockResolvedValue(0);

    const res = await CHECK_BALANCE();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toEqual({ checked: true, notificationsCreated: 0 });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null,
      error: true,
    } as never);

    const res = await CHECK_BALANCE();
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});

describe("POST /api/notifications/check-reminders — trigger expense reminder check", () => {
  it("calls checkExpenseReminder and returns result", async () => {
    mockCheckReminder.mockResolvedValue(true);

    const res = await CHECK_REMINDERS();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toEqual({ checked: true, notificationCreated: true });
    expect(mockCheckReminder).toHaveBeenCalledWith("user-1");
  });

  it("returns false when no reminder needed", async () => {
    mockCheckReminder.mockResolvedValue(false);

    const res = await CHECK_REMINDERS();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toEqual({ checked: true, notificationCreated: false });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null,
      error: true,
    } as never);

    const res = await CHECK_REMINDERS();
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});

describe("POST /api/notifications/check-spending — trigger unusual spending check", () => {
  it("calls checkRecentSpendingAnomalies and returns result", async () => {
    mockCheckSpending.mockResolvedValue(3);

    const res = await CHECK_SPENDING();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toEqual({ checked: true, notificationsCreated: 3 });
    expect(mockCheckSpending).toHaveBeenCalledWith("user-1");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null,
      error: true,
    } as never);

    const res = await CHECK_SPENDING();
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});
