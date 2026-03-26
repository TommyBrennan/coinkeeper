import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/spaces — list spaces the current user belongs to
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await db.spaceMember.findMany({
    where: { userId: user.id },
    include: {
      space: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          _count: { select: { accounts: true } },
        },
      },
    },
    orderBy: { space: { createdAt: "desc" } },
  });

  const spaces = memberships.map((m) => ({
    ...m.space,
    role: m.role,
    memberCount: m.space.members.length,
    accountCount: m.space._count.accounts,
  }));

  return NextResponse.json(spaces);
}

// POST /api/spaces — create a new space (caller becomes owner)
export async function POST(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Space name is required" },
      { status: 400 }
    );
  }

  if (name.trim().length > 100) {
    return NextResponse.json(
      { error: "Space name must be 100 characters or less" },
      { status: 400 }
    );
  }

  const space = await db.space.create({
    data: {
      name: name.trim(),
      members: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return NextResponse.json(
    { ...space, role: "owner", memberCount: 1, accountCount: 0 },
    { status: 201 }
  );
}
