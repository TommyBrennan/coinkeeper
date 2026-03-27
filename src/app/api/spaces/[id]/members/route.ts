import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { parseAndValidateBody } from "@/lib/api-utils";
import { inviteMemberSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/spaces/[id]/members — invite user by email
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;

  // Check caller is a member with owner or editor role
  const callerMembership = await db.spaceMember.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId } },
  });

  if (!callerMembership) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  if (callerMembership.role === "viewer") {
    return NextResponse.json(
      { error: "Viewers cannot invite members" },
      { status: 403 }
    );
  }

  const { data: body, error: parseError } = await parseAndValidateBody(request, inviteMemberSchema);
  if (parseError) return parseError;
  const { email, role } = body;

  // Only owners can invite other owners (role from schema is "editor" | "viewer")
  const assignRole = role;

  // Find user by email
  const invitee = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!invitee) {
    return NextResponse.json(
      { error: "No user found with that email address" },
      { status: 404 }
    );
  }

  // Check if already a member
  const existingMembership = await db.spaceMember.findUnique({
    where: { userId_spaceId: { userId: invitee.id, spaceId } },
  });

  if (existingMembership) {
    return NextResponse.json(
      { error: "User is already a member of this space" },
      { status: 409 }
    );
  }

  // Create membership
  const member = await db.spaceMember.create({
    data: {
      userId: invitee.id,
      spaceId,
      role: assignRole,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(member, { status: 201 });
}
