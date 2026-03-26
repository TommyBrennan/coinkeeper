import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { checkAllLowBalances } from "@/lib/check-low-balance";

/**
 * POST /api/notifications/check-balance — trigger low balance check for all user accounts
 * Returns the number of new notifications created.
 */
export async function POST() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const created = await checkAllLowBalances(user.id);

  return NextResponse.json({ checked: true, notificationsCreated: created });
}
