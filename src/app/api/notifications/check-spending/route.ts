import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { checkRecentSpendingAnomalies } from "@/lib/check-unusual-spending";

/**
 * POST /api/notifications/check-spending — scan recent transactions for unusual spending
 * This is a manual trigger; automatic checks happen on each new expense.
 */
export async function POST() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const created = await checkRecentSpendingAnomalies(user.id);

  return NextResponse.json({ checked: true, notificationsCreated: created });
}
