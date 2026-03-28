/**
 * Integration tests for /api/push routes.
 * Tests subscribe/unsubscribe and VAPID key endpoints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockUser, mockPushSubscriptionModel, mockGetVapidPublicKey } =
  vi.hoisted(() => {
    const createModel = () => ({
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(null),
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
      mockPushSubscriptionModel: createModel(),
      mockGetVapidPublicKey: vi.fn().mockReturnValue("test-vapid-public-key"),
    };
  });

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
  requireUser: vi.fn().mockResolvedValue(mockUser),
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
}));

vi.mock("@/lib/db", () => ({
  db: {
    pushSubscription: mockPushSubscriptionModel,
  },
}));

vi.mock("@/lib/push-notifications", () => ({
  getVapidPublicKey: mockGetVapidPublicKey,
}));

// ── Import handlers after mocking ────────────────────────────────────────────

import { POST, DELETE } from "../push/subscribe/route";
import { GET as GET_VAPID } from "../push/vapid-key/route";
import { requireApiUser } from "@/lib/auth";

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireApiUser).mockResolvedValue({
    user: mockUser,
    error: false,
  } as never);
  mockGetVapidPublicKey.mockReturnValue("test-vapid-public-key");
});

describe("POST /api/push/subscribe — save push subscription", () => {
  it("creates a push subscription with valid data", async () => {
    const subscription = {
      id: "sub-1",
      userId: "user-1",
      endpoint: "https://push.example.com/send/abc123",
      p256dh: "key-p256dh",
      auth: "key-auth",
    };
    mockPushSubscriptionModel.upsert.mockResolvedValue(subscription);

    const req = createRequest("http://localhost:3000/api/push/subscribe", {
      method: "POST",
      body: {
        endpoint: "https://push.example.com/send/abc123",
        keys: { p256dh: "key-p256dh", auth: "key-auth" },
      },
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(201);
    expect(data).toHaveProperty("id", "sub-1");
    expect(mockPushSubscriptionModel.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { endpoint: "https://push.example.com/send/abc123" },
        create: expect.objectContaining({
          userId: "user-1",
          endpoint: "https://push.example.com/send/abc123",
          p256dh: "key-p256dh",
          auth: "key-auth",
        }),
      })
    );
  });

  it("returns 400 when endpoint is missing", async () => {
    const req = createRequest("http://localhost:3000/api/push/subscribe", {
      method: "POST",
      body: { keys: { p256dh: "key", auth: "key" } },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("returns 400 when keys are missing", async () => {
    const req = createRequest("http://localhost:3000/api/push/subscribe", {
      method: "POST",
      body: { endpoint: "https://push.example.com/send/abc123" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("returns 400 when keys.p256dh is missing", async () => {
    const req = createRequest("http://localhost:3000/api/push/subscribe", {
      method: "POST",
      body: {
        endpoint: "https://push.example.com/send/abc123",
        keys: { auth: "key" },
      },
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

    const req = createRequest("http://localhost:3000/api/push/subscribe", {
      method: "POST",
      body: {
        endpoint: "https://push.example.com/send/abc123",
        keys: { p256dh: "key", auth: "key" },
      },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});

describe("DELETE /api/push/subscribe — remove push subscription", () => {
  it("deletes a subscription by endpoint", async () => {
    mockPushSubscriptionModel.deleteMany.mockResolvedValue({ count: 1 });

    const req = createRequest("http://localhost:3000/api/push/subscribe", {
      method: "DELETE",
      body: { endpoint: "https://push.example.com/send/abc123" },
    });
    const res = await DELETE(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toHaveProperty("ok", true);
    expect(mockPushSubscriptionModel.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        endpoint: "https://push.example.com/send/abc123",
      },
    });
  });

  it("returns 400 when endpoint is missing", async () => {
    const req = createRequest("http://localhost:3000/api/push/subscribe", {
      method: "DELETE",
      body: {},
    });
    const res = await DELETE(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null,
      error: true,
    } as never);

    const req = createRequest("http://localhost:3000/api/push/subscribe", {
      method: "DELETE",
      body: { endpoint: "https://push.example.com/send/abc123" },
    });
    const res = await DELETE(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});

describe("GET /api/push/vapid-key — return VAPID public key", () => {
  it("returns the VAPID public key", async () => {
    const res = await GET_VAPID();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toEqual({ publicKey: "test-vapid-public-key" });
  });

  it("returns 503 when VAPID key is not configured", async () => {
    mockGetVapidPublicKey.mockReturnValue(null);

    const res = await GET_VAPID();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(503);
    expect(data).toHaveProperty("error");
  });
});
