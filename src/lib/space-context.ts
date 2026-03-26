import { cookies } from "next/headers";
import { db } from "./db";

const SPACE_COOKIE = "ck_space";

export interface SpaceContext {
  spaceId: string | null;
  spaceName: string | null;
  role: "owner" | "editor" | "viewer" | null;
}

/**
 * Get the active space context from the cookie.
 * Validates that the user is a member of the space.
 * Returns null spaceId for personal context.
 */
export async function getSpaceContext(userId: string): Promise<SpaceContext> {
  const cookieStore = await cookies();
  const spaceId = cookieStore.get(SPACE_COOKIE)?.value || null;

  if (!spaceId) {
    return { spaceId: null, spaceName: null, role: null };
  }

  // Validate membership
  const membership = await db.spaceMember.findUnique({
    where: { userId_spaceId: { userId, spaceId } },
    include: { space: true },
  });

  if (!membership) {
    // User is not a member — fall back to personal
    return { spaceId: null, spaceName: null, role: null };
  }

  return {
    spaceId: membership.spaceId,
    spaceName: membership.space.name,
    role: membership.role as SpaceContext["role"],
  };
}

/**
 * Check if a user has the required minimum role in a space.
 * Role hierarchy: owner > editor > viewer.
 * Returns the membership if allowed, null otherwise.
 */
const ROLE_LEVELS: Record<string, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export async function checkSpacePermission(
  userId: string,
  spaceId: string,
  requiredRole: "viewer" | "editor" | "owner" = "viewer"
): Promise<{ allowed: boolean; role: string | null }> {
  const membership = await db.spaceMember.findUnique({
    where: { userId_spaceId: { userId, spaceId } },
  });

  if (!membership) {
    return { allowed: false, role: null };
  }

  const userLevel = ROLE_LEVELS[membership.role] ?? -1;
  const requiredLevel = ROLE_LEVELS[requiredRole] ?? 0;

  return {
    allowed: userLevel >= requiredLevel,
    role: membership.role,
  };
}

/**
 * Get all account IDs belonging to a space.
 */
export async function getSpaceAccountIds(spaceId: string): Promise<string[]> {
  const accounts = await db.account.findMany({
    where: { spaceId },
    select: { id: true },
  });
  return accounts.map((a) => a.id);
}

/**
 * Set the active space context cookie.
 * Pass null to switch to personal context.
 */
export async function setSpaceContext(spaceId: string | null) {
  const cookieStore = await cookies();

  if (spaceId) {
    cookieStore.set(SPACE_COOKIE, spaceId, {
      httpOnly: false, // Client needs to read for optimistic UI
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 year
    });
  } else {
    cookieStore.delete(SPACE_COOKIE);
  }
}
