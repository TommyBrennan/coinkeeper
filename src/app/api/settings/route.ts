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
    select: { reminderDays: true, baseCurrency: true },
  });

  return NextResponse.json({
    reminderDays: fullUser?.reminderDays ?? null,
    baseCurrency: fullUser?.baseCurrency ?? "USD",
  });
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
  const { reminderDays, baseCurrency } = body;

  // Build update data
  const data: Record<string, unknown> = {};

  // Validate reminderDays
  if (reminderDays !== undefined) {
    if (reminderDays !== null) {
      const days = parseInt(reminderDays, 10);
      if (isNaN(days) || days < 1) {
        return NextResponse.json(
          { error: "Reminder days must be a positive integer or null" },
          { status: 400 }
        );
      }
      data.reminderDays = days;
    } else {
      data.reminderDays = null;
    }
  }

  // Validate baseCurrency
  if (baseCurrency !== undefined) {
    if (typeof baseCurrency !== "string" || baseCurrency.length !== 3) {
      return NextResponse.json(
        { error: "Base currency must be a 3-letter ISO currency code" },
        { status: 400 }
      );
    }
    data.baseCurrency = baseCurrency.toUpperCase();
  }

  if (Object.keys(data).length > 0) {
    await db.user.update({
      where: { id: user.id },
      data,
    });
  }

  return NextResponse.json({ success: true });
}
