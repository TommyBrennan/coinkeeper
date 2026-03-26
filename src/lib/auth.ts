import { redirect } from "next/navigation";
import { getSession } from "./session";

/**
 * Get the current authenticated user from the session cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return session.user;
}

/**
 * Get the current authenticated user, or throw/redirect if not authenticated.
 * Use in API routes and server components that require auth.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    // In server components, redirect to login
    redirect("/auth/register");
  }
  return user;
}

/**
 * Get the current authenticated user for API routes.
 * Returns { user } or { error } response.
 */
export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null as never, error: true as const };
  }
  return { user, error: false as const };
}
