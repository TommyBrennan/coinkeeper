/**
 * Integration tests for /api/spaces/[id]/members routes.
 * Tests member invite, role changes, and removal with RBAC.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockUser, mockSpaceMemberModel, mockUserModel } = vi.hoisted(() => {
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
      name: "Owner User",
      email: "owner@example.com",
      reminderDays: null,
      baseCurrency: "USD",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    mockSpaceMemberModel: createModel(),
    mockUserModel: createModel(),
  };
});

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
  requireUser: vi.fn().mockResolvedValue(mockUser),
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
}));

vi.mock("@/lib/db", () => ({
  db: {
    spaceMember: mockSpaceMemberModel,
    user: mockUserModel,
  },
}));

// ── Import handlers after mocking ────────────────────────────────────────────

import { POST } from "../spaces/[id]/members/route";
import {
  PATCH,
  DELETE,
} from "../spaces/[id]/members/[memberId]/route";
import { requireApiUser } from "@/lib/auth";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMemberParams(id: string, memberId: string) {
  return { params: Promise.resolve({ id, memberId }) };
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Tests: POST /api/spaces/[id]/members ─────────────────────────────────────

describe("POST /api/spaces/[id]/members — invite member", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
  });

  it("owner can invite a user as editor", async () => {
    // Caller is owner
    mockSpaceMemberModel.findUnique
      .mockResolvedValueOnce({
        id: "member-1",
        userId: "user-1",
        spaceId: "space-1",
        role: "owner",
      })
      // Invitee not already a member
      .mockResolvedValueOnce(null);

    // Invitee exists
    mockUserModel.findUnique.mockResolvedValue({
      id: "user-2",
      name: "Invitee",
      email: "invitee@example.com",
    });

    // Membership created
    mockSpaceMemberModel.create.mockResolvedValue({
      id: "member-2",
      userId: "user-2",
      spaceId: "space-1",
      role: "editor",
      user: { id: "user-2", name: "Invitee", email: "invitee@example.com" },
    });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members",
      {
        method: "POST",
        body: { email: "invitee@example.com", role: "editor" },
      }
    );
    const res = await POST(req, makeParams("space-1"));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(201);
    expect(data).toMatchObject({
      id: "member-2",
      role: "editor",
      user: expect.objectContaining({ email: "invitee@example.com" }),
    });
  });

  it("editor can invite a user as viewer", async () => {
    mockSpaceMemberModel.findUnique
      .mockResolvedValueOnce({
        id: "member-1",
        userId: "user-1",
        spaceId: "space-1",
        role: "editor",
      })
      .mockResolvedValueOnce(null);

    mockUserModel.findUnique.mockResolvedValue({
      id: "user-3",
      name: "New Viewer",
      email: "viewer@example.com",
    });

    mockSpaceMemberModel.create.mockResolvedValue({
      id: "member-3",
      userId: "user-3",
      spaceId: "space-1",
      role: "viewer",
      user: { id: "user-3", name: "New Viewer", email: "viewer@example.com" },
    });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members",
      {
        method: "POST",
        body: { email: "viewer@example.com", role: "viewer" },
      }
    );
    const res = await POST(req, makeParams("space-1"));
    const { status } = await parseResponse(res);

    expect(status).toBe(201);
  });

  it("returns 403 when viewer tries to invite", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "viewer",
    });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members",
      {
        method: "POST",
        body: { email: "someone@example.com", role: "viewer" },
      }
    );
    const res = await POST(req, makeParams("space-1"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(403);
    expect(data.error).toContain("Viewers");
  });

  it("returns 404 when invitee email not found", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockUserModel.findUnique.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members",
      {
        method: "POST",
        body: { email: "noone@example.com", role: "editor" },
      }
    );
    const res = await POST(req, makeParams("space-1"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(404);
    expect(data.error).toContain("No user found");
  });

  it("returns 409 when user is already a member", async () => {
    // Caller is owner
    mockSpaceMemberModel.findUnique
      .mockResolvedValueOnce({
        id: "member-1",
        userId: "user-1",
        spaceId: "space-1",
        role: "owner",
      })
      // Invitee already a member
      .mockResolvedValueOnce({
        id: "member-2",
        userId: "user-2",
        spaceId: "space-1",
        role: "editor",
      });

    mockUserModel.findUnique.mockResolvedValue({
      id: "user-2",
      name: "Already In",
      email: "already@example.com",
    });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members",
      {
        method: "POST",
        body: { email: "already@example.com", role: "editor" },
      }
    );
    const res = await POST(req, makeParams("space-1"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(409);
    expect(data.error).toContain("already a member");
  });

  it("returns 404 when caller is not a space member", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members",
      {
        method: "POST",
        body: { email: "someone@example.com", role: "editor" },
      }
    );
    const res = await POST(req, makeParams("space-1"));
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      user: null as never,
      error: true,
    });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members",
      {
        method: "POST",
        body: { email: "test@example.com", role: "editor" },
      }
    );
    const res = await POST(req, makeParams("space-1"));
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });
});

// ── Tests: PATCH /api/spaces/[id]/members/[memberId] ─────────────────────────

describe("PATCH /api/spaces/[id]/members/[memberId] — change role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
  });

  it("owner can change member role to viewer", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceMemberModel.findFirst.mockResolvedValue({
      id: "member-2",
      userId: "user-2",
      spaceId: "space-1",
      role: "editor",
    });
    mockSpaceMemberModel.update.mockResolvedValue({
      id: "member-2",
      userId: "user-2",
      spaceId: "space-1",
      role: "viewer",
      user: { id: "user-2", name: "Member", email: "member@example.com" },
    });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-2",
      { method: "PATCH", body: { role: "viewer" } }
    );
    const res = await PATCH(req, makeMemberParams("space-1", "member-2"));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(200);
    expect(data).toMatchObject({ id: "member-2", role: "viewer" });
  });

  it("owner can promote member to owner", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceMemberModel.findFirst.mockResolvedValue({
      id: "member-2",
      userId: "user-2",
      spaceId: "space-1",
      role: "editor",
    });
    mockSpaceMemberModel.update.mockResolvedValue({
      id: "member-2",
      userId: "user-2",
      spaceId: "space-1",
      role: "owner",
      user: { id: "user-2", name: "New Owner", email: "new@example.com" },
    });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-2",
      { method: "PATCH", body: { role: "owner" } }
    );
    const res = await PATCH(req, makeMemberParams("space-1", "member-2"));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(200);
    expect(data).toMatchObject({ role: "owner" });
  });

  it("returns 403 when editor tries to change roles", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-2",
      userId: "user-1",
      spaceId: "space-1",
      role: "editor",
    });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-3",
      { method: "PATCH", body: { role: "viewer" } }
    );
    const res = await PATCH(req, makeMemberParams("space-1", "member-3"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(403);
    expect(data.error).toContain("owner");
  });

  it("returns 400 for invalid role", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceMemberModel.findFirst.mockResolvedValue({
      id: "member-2",
      userId: "user-2",
      spaceId: "space-1",
      role: "editor",
    });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-2",
      { method: "PATCH", body: { role: "admin" } }
    );
    const res = await PATCH(req, makeMemberParams("space-1", "member-2"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(400);
    expect(data.error).toContain("Invalid role");
  });

  it("returns 409 when sole owner tries to demote self", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceMemberModel.findFirst.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceMemberModel.count.mockResolvedValue(1);

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-1",
      { method: "PATCH", body: { role: "editor" } }
    );
    const res = await PATCH(req, makeMemberParams("space-1", "member-1"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(409);
    expect(data.error).toContain("only owner");
  });

  it("returns 404 for nonexistent member", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceMemberModel.findFirst.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-999",
      { method: "PATCH", body: { role: "viewer" } }
    );
    const res = await PATCH(req, makeMemberParams("space-1", "member-999"));
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });
});

// ── Tests: DELETE /api/spaces/[id]/members/[memberId] ────────────────────────

describe("DELETE /api/spaces/[id]/members/[memberId] — remove member", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
  });

  it("owner can remove a member", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceMemberModel.findFirst.mockResolvedValue({
      id: "member-2",
      userId: "user-2",
      spaceId: "space-1",
      role: "editor",
    });
    mockSpaceMemberModel.delete.mockResolvedValue({ id: "member-2" });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-2",
      { method: "DELETE" }
    );
    const res = await DELETE(req, makeMemberParams("space-1", "member-2"));
    const { status, data } = await parseResponse<{ success: boolean }>(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSpaceMemberModel.delete).toHaveBeenCalledWith({
      where: { id: "member-2" },
    });
  });

  it("returns 403 when editor tries to remove a member", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-2",
      userId: "user-1",
      spaceId: "space-1",
      role: "editor",
    });

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-3",
      { method: "DELETE" }
    );
    const res = await DELETE(req, makeMemberParams("space-1", "member-3"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(403);
    expect(data.error).toContain("owner");
  });

  it("returns 409 when sole owner tries to remove self", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceMemberModel.findFirst.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceMemberModel.count.mockResolvedValue(1);

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-1",
      { method: "DELETE" }
    );
    const res = await DELETE(req, makeMemberParams("space-1", "member-1"));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(409);
    expect(data.error).toContain("only owner");
  });

  it("returns 404 for nonexistent member", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      spaceId: "space-1",
      role: "owner",
    });
    mockSpaceMemberModel.findFirst.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-999",
      { method: "DELETE" }
    );
    const res = await DELETE(req, makeMemberParams("space-1", "member-999"));
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });

  it("returns 404 when caller is not a member", async () => {
    mockSpaceMemberModel.findUnique.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost:3000/api/spaces/space-1/members/member-2",
      { method: "DELETE" }
    );
    const res = await DELETE(req, makeMemberParams("space-1", "member-2"));
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });
});
