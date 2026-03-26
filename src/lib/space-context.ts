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
