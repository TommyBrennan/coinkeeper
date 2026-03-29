import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTotpToken, generateBackupCodes } from "@/lib/totp";
import { logAuditEvent } from "@/lib/audit";

/**
 * POST /api/auth/totp/backup-codes
 * Regenerate backup codes. Requires a valid TOTP code for confirmation.
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireApiUser();
    if (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { code?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { code } = body;
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "TOTP code is required" },
        { status: 400 }
      );
    }

    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!currentUser?.totpEnabled || !currentUser.totpSecret) {
      return NextResponse.json(
        { error: "TOTP 2FA is not enabled." },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = verifyTotpToken(code, currentUser.totpSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid TOTP code." },
        { status: 400 }
      );
    }

    // Generate new backup codes
    const { plain: backupCodes, hashed: hashedBackupCodes } =
      generateBackupCodes();

    await db.user.update({
      where: { id: user.id },
      data: {
        totpBackupCodes: JSON.stringify(hashedBackupCodes),
      },
    });

    // Audit: backup codes regenerated
    logAuditEvent("totp_backup_regenerated", user.id, null, request);

    return NextResponse.json({
      backupCodes,
      message:
        "New backup codes generated. Previous codes are now invalid.",
    });
  } catch (err) {
    console.error("TOTP backup codes error:", err);
    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 }
    );
  }
}
