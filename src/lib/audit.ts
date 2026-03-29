import { db } from "@/lib/db";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "register"
  | "totp_enabled"
  | "totp_disabled"
  | "totp_backup_regenerated"
  | "passkey_added"
  | "space_member_added"
  | "space_member_removed"
  | "space_member_role_changed";

/**
 * Log a security-sensitive action to the audit log.
 *
 * @param action - The action type
 * @param userId - The user performing the action (null for failed logins)
 * @param metadata - Optional JSON-serializable context
 * @param request - Optional Request to extract IP and user agent
 */
export async function logAuditEvent(
  action: AuditAction,
  userId: string | null,
  metadata?: Record<string, unknown> | null,
  request?: Request | null
): Promise<void> {
  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  if (request) {
    ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    userAgent = request.headers.get("user-agent") || null;
  }

  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("Failed to write audit log:", error);
  }
}
