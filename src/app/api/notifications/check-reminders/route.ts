import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { checkExpenseReminder } from "@/lib/check-expense-reminders";

/**
 * POST /api/notifications/check-reminders — trigger expense reminder check
 */
export async function POST() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const created = await checkExpenseReminder(user.id);

  return NextResponse.json({ checked: true, notificationCreated: created });
}
