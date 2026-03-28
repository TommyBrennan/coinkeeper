import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTotpToken, generateBackupCodes } from "@/lib/totp";

/**
 * POST /api/auth/totp/enable
 * Verify user's TOTP code and enable 2FA.
 * Body: { code: string }
 * Returns backup codes on success.
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

    // Get user's pending secret
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!currentUser?.totpSecret) {
      return NextResponse.json(
        { error: "No TOTP secret found. Call /api/auth/totp/setup first." },
        { status: 400 }
      );
    }

    if (currentUser.totpEnabled) {
      return NextResponse.json(
        { error: "TOTP 2FA is already enabled." },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = verifyTotpToken(code, currentUser.totpSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid TOTP code. Please try again." },
        { status: 400 }
      );
    }

    // Generate backup codes
    const { plain: backupCodes, hashed: hashedBackupCodes } =
      generateBackupCodes();

    // Enable TOTP and store backup codes
    await db.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: true,
        totpBackupCodes: JSON.stringify(hashedBackupCodes),
      },
    });

    return NextResponse.json({
      enabled: true,
      backupCodes,
      message:
        "TOTP 2FA is now enabled. Save your backup codes in a safe place.",
    });
  } catch (err) {
    console.error("TOTP enable error:", err);
    return NextResponse.json(
      { error: "Failed to enable TOTP" },
      { status: 500 }
    );
  }
}
