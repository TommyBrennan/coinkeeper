import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { parseAndValidateBody } from "@/lib/api-utils";
import { createSpaceSchema } from "@/lib/validations";

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

  const { data: body, error: parseError } = await parseAndValidateBody(request, createSpaceSchema);
  if (parseError) return parseError;
  const { name } = body;

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
