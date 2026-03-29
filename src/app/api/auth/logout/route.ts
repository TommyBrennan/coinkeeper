import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { requireApiUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

/**
 * POST /api/auth/logout
 * Destroy the current session and clear the session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    // Capture user before destroying session
    const { user } = await requireApiUser();
    await destroySession();

    // Audit: logout
    if (user) {
      logAuditEvent("logout", user.id, null, request);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to log out" },
      { status: 500 }
    );
  }
}
