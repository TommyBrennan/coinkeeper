import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { verifyTotpToken, verifyBackupCode } from "@/lib/totp";
import { logAuditEvent } from "@/lib/audit";

const PENDING_2FA_COOKIE = "ck_pending_2fa";

/**
 * POST /api/auth/totp/verify
 * Verify TOTP code or backup code during login flow.
 * Requires a valid pending-2fa cookie from WebAuthn step.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    // Read and validate pending-2fa cookie
    const pendingCookie = req.cookies.get(PENDING_2FA_COOKIE)?.value;
    if (!pendingCookie) {
      return NextResponse.json(
        { error: "No pending 2FA session. Please log in again." },
        { status: 401 }
      );
    }

    let payload: { userId: string; token: string; expiresAt: number };
    try {
      payload = JSON.parse(Buffer.from(pendingCookie, "base64").toString());
    } catch {
      return NextResponse.json(
        { error: "Invalid 2FA session. Please log in again." },
        { status: 401 }
      );
    }

    // Check expiry
    if (!payload.userId || !payload.expiresAt || payload.expiresAt < Date.now()) {
      const response = NextResponse.json(
        { error: "2FA session expired. Please log in again." },
        { status: 401 }
      );
      response.cookies.delete(PENDING_2FA_COOKIE);
      return response;
    }

    // Fetch user with TOTP data
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        totpEnabled: true,
        totpSecret: true,
        totpBackupCodes: true,
      },
    });

    if (!user || !user.totpEnabled || !user.totpSecret) {
      const response = NextResponse.json(
        { error: "2FA is not configured for this account." },
        { status: 400 }
      );
      response.cookies.delete(PENDING_2FA_COOKIE);
      return response;
    }

    const trimmedCode = code.trim();

    // Try TOTP code first
    const isValidTotp = verifyTotpToken(trimmedCode, user.totpSecret);

    if (isValidTotp) {
      // TOTP code valid — create full session
      await createSession(user.id);

      // Audit: login via TOTP
      logAuditEvent("login", user.id, { method: "totp" }, req);

      const response = NextResponse.json({ success: true });
      response.cookies.delete(PENDING_2FA_COOKIE);
      return response;
    }

    // Try backup code (format: XXXX-XXXX)
    if (user.totpBackupCodes) {
      let hashedCodes: string[];
      try {
        hashedCodes = JSON.parse(user.totpBackupCodes);
      } catch {
        hashedCodes = [];
      }

      if (hashedCodes.length > 0) {
        const matchIndex = verifyBackupCode(trimmedCode, hashedCodes);

        if (matchIndex >= 0) {
          // Backup code valid — consume it and create session
          hashedCodes.splice(matchIndex, 1);
          await db.user.update({
            where: { id: user.id },
            data: { totpBackupCodes: JSON.stringify(hashedCodes) },
          });

          await createSession(user.id);

          // Audit: login via backup code
          logAuditEvent("login", user.id, { method: "backup_code", backupCodesRemaining: hashedCodes.length }, req);

          const response = NextResponse.json({
            success: true,
            backupCodeUsed: true,
            backupCodesRemaining: hashedCodes.length,
          });
          response.cookies.delete(PENDING_2FA_COOKIE);
          return response;
        }
      }
    }

    // Neither TOTP nor backup code matched
    return NextResponse.json(
      { error: "Invalid verification code. Please try again." },
      { status: 401 }
    );
  } catch (error) {
    console.error("TOTP verify error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
