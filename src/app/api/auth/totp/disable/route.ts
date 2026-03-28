import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTotpToken } from "@/lib/totp";

/**
 * POST /api/auth/totp/disable
 * Disable TOTP 2FA. Requires a valid TOTP code for confirmation.
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
        { error: "TOTP code is required to disable 2FA" },
        { status: 400 }
      );
    }

    // Get user's current TOTP state
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
        { error: "Invalid TOTP code. Please try again." },
        { status: 400 }
      );
    }

    // Disable TOTP and clear secret/backup codes
    await db.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: null,
      },
    });

    return NextResponse.json({
      disabled: true,
      message: "TOTP 2FA has been disabled.",
    });
  } catch (err) {
    console.error("TOTP disable error:", err);
    return NextResponse.json(
      { error: "Failed to disable TOTP" },
      { status: 500 }
    );
  }
}
