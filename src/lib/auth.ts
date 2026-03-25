import { db } from "./db";

/**
 * Temporary: returns a seed user for development.
 * Will be replaced with real auth (WebAuthn) in issue #8.
 */
export async function getCurrentUser() {
  const SEED_EMAIL = "dev@coinkeeper.local";

  let user = await db.user.findUnique({
    where: { email: SEED_EMAIL },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        name: "Dev User",
        email: SEED_EMAIL,
      },
    });
  }

  return user;
}
