import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string; memberId: string }> };

// PATCH /api/spaces/[id]/members/[memberId] — change member role (owner only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId, memberId } = await params;

  // Check caller is owner
  const callerMembership = await db.spaceMember.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId } },
  });

  if (!callerMembership) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  if (callerMembership.role !== "owner") {
    return NextResponse.json(
      { error: "Only space owners can change member roles" },
      { status: 403 }
    );
  }

  // Find target member
  const targetMember = await db.spaceMember.findFirst({
    where: { id: memberId, spaceId },
  });

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const body = await request.json();
  const { role } = body;

  if (!role || !["owner", "editor", "viewer"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be one of: owner, editor, viewer" },
      { status: 400 }
    );
  }

  // Prevent demoting self if sole owner
  if (targetMember.userId === user.id && targetMember.role === "owner" && role !== "owner") {
    const ownerCount = await db.spaceMember.count({
      where: { spaceId, role: "owner" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot change role — you are the only owner. Promote another member first." },
        { status: 409 }
      );
    }
  }

  const updated = await db.spaceMember.update({
    where: { id: memberId },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/spaces/[id]/members/[memberId] — remove member (owner only)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId, memberId } = await params;

  // Check caller is owner
  const callerMembership = await db.spaceMember.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId } },
  });

  if (!callerMembership) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  if (callerMembership.role !== "owner") {
    return NextResponse.json(
      { error: "Only space owners can remove members" },
      { status: 403 }
    );
  }

  // Find target member
  const targetMember = await db.spaceMember.findFirst({
    where: { id: memberId, spaceId },
  });

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Prevent removing self if sole owner
  if (targetMember.userId === user.id) {
    const ownerCount = await db.spaceMember.count({
      where: { spaceId, role: "owner" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove yourself — you are the only owner. Transfer ownership first." },
        { status: 409 }
      );
    }
  }

  await db.spaceMember.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
