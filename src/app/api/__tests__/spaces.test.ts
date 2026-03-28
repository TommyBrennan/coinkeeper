/**
 * Integration tests for /api/spaces and /api/spaces/[id] routes.
 * Tests CRUD operations and role-based access control.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockUser, mockSpaceModel, mockSpaceMemberModel, mockAccountModel } =
  vi.hoisted(() => {
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
      mockSpaceModel: createModel(),
      mockSpaceMemberModel: createModel(),
      mockAccountModel: createModel(),
    };
  });

const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
  requireUser: vi.fn().mockResolvedValue(mockUser),
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
}));

vi.mock("@/lib/db", () => ({
  db: {
    space: mockSpaceModel,
    spaceMember: mockSpaceMemberModel,
    account: mockAccountModel,
    $transaction: mockTransaction,
  },
}));

// ── Import handlers after mocking ────────────────────────────────────────────

import { GET, POST } from "../spaces/route";
import {
  GET as GET_BY_ID,
  PATCH,
  DELETE,
} from "../spaces/[id]/route";
import { requireApiUser } from "@/lib/auth";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockSpace(overrides: Record<string, unknown> = {}) {
  return {
    id: "space-1",
    name: "Family Budget",
    description: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    members: [
      {
        id: "member-1",
        userId: "user-1",
        spaceId: "space-1",
        role: "owner",
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
      },
    ],
    _count: { accounts: 2 },
    ...overrides,
  };
}

function createMockMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: "member-1",
    userId: "user-1",
    spaceId: "space-1",
    role: "owner",
    createdAt: new Date("2026-01-01"),
    space: createMockSpace(),
    ...overrides,
  };
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Tests: GET /api/spaces ───────────────────────────────────────────────────

describe("GET /api/spaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
  });

  it("returns empty array when user has no spaces", async () => {
    mockSpaceMemberModel.findMany.mockResolvedValue([]);

    const res = await GET();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns spaces with role, memberCount, accountCount", async () => {
    const membership = createMockMembership();
    mockSpaceMemberModel.findMany.mockResolvedValue([membership]);

    const res = await GET();
    const { status, data } = await parseResponse<Array<Record<string, unknown>>>(res);

    expect(status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: "space-1",
      name: "Family Budget",
      role: "owner",
      memberCount: 1,
      accountCount: 2,
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null as never,
      error: true,
    });

    const res = await GET();
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });
});

// ── Tests: POST /api/spaces ──────────────────────────────────────────────────

describe("POST /api/spaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
  });

  it("creates a space and makes caller the owner", async () => {
    const newSpace = createMockSpace();
    mockSpaceModel.create.mockResolvedValue(newSpace);

    const req = createRequest("http://localhost:3000/api/spaces", {
      method: "POST",
      body: { name: "Family Budget" },
    });
    const res = await POST(req);
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(201);
    expect(data).toMatchObject({
      id: "space-1",
      name: "Family Budget",
      role: "owner",
      memberCount: 1,
      accountCount: 0,
    });

    expect(mockSpaceModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Family Budget",
          members: {
            create: { userId: "user-1", role: "owner" },
          },
        }),
      })
    );
  });

  it("trims whitespace from space name", async () => {
    const newSpace = createMockSpace({ name: "Budget" });
    mockSpaceModel.create.mockResolvedValue(newSpace);

    const req = createRequest("http://localhost:3000/api/spaces", {
      method: "POST",
      body: { name: "  Budget  " },
    });
    await POST(req);

    expect(mockSpaceModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Budget" }),
      })
    );
  });

  it("returns 400 for missing name", async () => {
    const req = createRequest("http://localhost:3000/api/spaces", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null as never,
      error: true,
    });

    const req = createRequest("http://localhost:3000/api/spaces", {
      method: "POST",
      body: { name: "Test" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });
});

// ── Tests: GET /api/spaces/[id] ──────────────────────────────────────────────

describe("GET /api/spaces/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
  });

  it("returns space details for a member", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "editor",
    });
    mockSpaceModel.findUnique.mockResolvedValue(createMockSpace());

    const req = createRequest("http://localhost:3000/api/spaces/space-1");
    const res = await GET_BY_ID(req, makeParams("space-1"));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(200);
    expect(data).toMatchObject({
      id: "space-1",
      name: "Family Budget",
      role: "editor",
      memberCount: 1,
      accountCount: 2,
    });
  });

  it("returns 404 for non-member", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue(null);

    const req = createRequest("http://localhost:3000/api/spaces/space-1");
    const res = await GET_BY_ID(req, makeParams("space-1"));
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });

  it("returns 404 for nonexistent space", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-999",
      role: "owner",
    });
    mockSpaceModel.findUnique.mockResolvedValue(null);

    const req = createRequest("http://localhost:3000/api/spaces/space-999");
    const res = await GET_BY_ID(req, makeParams("space-999"));
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });
});

// ── Tests: PATCH /api/spaces/[id] ────────────────────────────────────────────

describe("PATCH /api/spaces/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
  });

  it("allows owner to update space name", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceModel.update.mockResolvedValue(
      createMockSpace({ name: "New Name" })
    );

    const req = createRequest("http://localhost:3000/api/spaces/space-1", {
      method: "PATCH",
      body: { name: "New Name" },
    });
    const res = await PATCH(req, makeParams("space-1"));
    const { status } = await parseResponse(res);

    expect(status).toBe(200);
    expect(mockSpaceModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "space-1" },
        data: expect.objectContaining({ name: "New Name" }),
      })
    );
  });

  it("returns 403 when editor tries to update space", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-2",
      userId: "user-1",
      spaceId: "space-1",
      role: "editor",
    });

    const req = createRequest("http://localhost:3000/api/spaces/space-1", {
      method: "PATCH",
      body: { name: "Hacked" },
    });
    const res = await PATCH(req, makeParams("space-1"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(403);
    expect(data.error).toContain("owner");
  });

  it("returns 403 when viewer tries to update space", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-3",
      userId: "user-1",
      spaceId: "space-1",
      role: "viewer",
    });

    const req = createRequest("http://localhost:3000/api/spaces/space-1", {
      method: "PATCH",
      body: { name: "Hacked" },
    });
    const res = await PATCH(req, makeParams("space-1"));
    const { status } = await parseResponse(res);

    expect(status).toBe(403);
  });

  it("returns 404 for non-member", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue(null);

    const req = createRequest("http://localhost:3000/api/spaces/space-1", {
      method: "PATCH",
      body: { name: "Test" },
    });
    const res = await PATCH(req, makeParams("space-1"));
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });
});

// ── Tests: DELETE /api/spaces/[id] ───────────────────────────────────────────

describe("DELETE /api/spaces/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
  });

  it("allows owner to delete space with no accounts", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockAccountModel.count.mockResolvedValue(0);
    mockTransaction.mockResolvedValue(undefined);

    const req = createRequest("http://localhost:3000/api/spaces/space-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("space-1"));
    const { status, data } = await parseResponse<{ success: boolean }>(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("returns 409 when space has accounts", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockAccountModel.count.mockResolvedValue(3);

    const req = createRequest("http://localhost:3000/api/spaces/space-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("space-1"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(409);
    expect(data.error).toContain("3 account(s)");
  });

  it("returns 403 when editor tries to delete space", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-2",
      userId: "user-1",
      spaceId: "space-1",
      role: "editor",
    });

    const req = createRequest("http://localhost:3000/api/spaces/space-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("space-1"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(403);
    expect(data.error).toContain("owner");
  });

  it("returns 404 for non-member", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue(null);

    const req = createRequest("http://localhost:3000/api/spaces/space-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("space-1"));
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });
});
