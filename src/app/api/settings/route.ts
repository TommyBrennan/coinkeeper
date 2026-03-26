import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/settings — get current user settings
 */
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    select: { reminderDays: true },
  });

  return NextResponse.json({ reminderDays: fullUser?.reminderDays ?? null });
}

/**
 * PATCH /api/settings — update user settings
 */
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { reminderDays } = body;

  // Validate reminderDays
  if (reminderDays !== null && reminderDays !== undefined) {
    const days = parseInt(reminderDays, 10);
    if (isNaN(days) || days < 1) {
      return NextResponse.json(
        { error: "Reminder days must be a positive integer or null" },
        { status: 400 }
      );
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      reminderDays: reminderDays !== null && reminderDays !== undefined
        ? parseInt(reminderDays, 10)
        : null,
    },
  });

  return NextResponse.json({ success: true });
}
