import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/auth/totp/status
 * Check whether TOTP 2FA is enabled for the current user.
 */
export async function GET() {
  try {
    const { user, error } = await requireApiUser();
    if (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { totpEnabled: true, totpBackupCodes: true },
    });

    const backupCodesRemaining = currentUser?.totpBackupCodes
      ? JSON.parse(currentUser.totpBackupCodes).length
      : 0;

    return NextResponse.json({
      enabled: currentUser?.totpEnabled ?? false,
      backupCodesRemaining,
    });
  } catch (err) {
    console.error("TOTP status error:", err);
    return NextResponse.json(
      { error: "Failed to get TOTP status" },
      { status: 500 }
    );
  }
}
