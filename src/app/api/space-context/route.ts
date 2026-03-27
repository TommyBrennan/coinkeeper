import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { setSpaceContext, getSpaceContext } from "@/lib/space-context";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/api-utils";

// GET /api/space-context — get current space context
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getSpaceContext(user.id);
  return NextResponse.json(context);
}

// POST /api/space-context — set active space
// Body: { spaceId: string | null }
export async function POST(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;
  const { spaceId } = body;

  if (spaceId) {
    // Validate membership
    const membership = await db.spaceMember.findUnique({
      where: { userId_spaceId: { userId: user.id, spaceId } },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this space" },
        { status: 403 }
      );
    }
  }

  await setSpaceContext(spaceId || null);

  return NextResponse.json({ success: true, spaceId: spaceId || null });
}
