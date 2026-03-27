import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { parseAndValidateBody } from "@/lib/api-utils";
import { updateSpaceSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/spaces/[id] — get space details with members
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check user is a member
  const membership = await db.spaceMember.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId: id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const space = await db.space.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { role: "asc" },
      },
      _count: { select: { accounts: true } },
    },
  });

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...space,
    role: membership.role,
    memberCount: space.members.length,
    accountCount: space._count.accounts,
  });
}

// PATCH /api/spaces/[id] — update space (owner only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check user is owner
  const membership = await db.spaceMember.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId: id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  if (membership.role !== "owner") {
    return NextResponse.json(
      { error: "Only space owners can update space settings" },
      { status: 403 }
    );
  }

  const { data: body, error: parseError } = await parseAndValidateBody(request, updateSpaceSchema);
  if (parseError) return parseError;
  const { name, description } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;

  const updated = await db.space.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// DELETE /api/spaces/[id] — delete space (owner only)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check user is owner
  const membership = await db.spaceMember.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId: id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  if (membership.role !== "owner") {
    return NextResponse.json(
      { error: "Only space owners can delete a space" },
      { status: 403 }
    );
  }

  // Check for accounts — prevent deletion if space has accounts
  const accountCount = await db.account.count({ where: { spaceId: id } });
  if (accountCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete space with ${accountCount} account(s). Remove or reassign accounts first.`,
      },
      { status: 409 }
    );
  }

  // Delete memberships and space (cascade should handle members, but be explicit)
  await db.$transaction([
    db.spaceMember.deleteMany({ where: { spaceId: id } }),
    db.space.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
