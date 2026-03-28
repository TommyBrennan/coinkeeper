import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext } from "@/lib/space-context";
import { db } from "@/lib/db";

/**
 * GET /api/notifications — list notifications for the current user
 * Query params:
 *   - unreadOnly: "true" to filter only unread
 *   - limit: number (default 50)
 *   - offset: number (default 0)
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = req.nextUrl;
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const rawLimit = Number(url.searchParams.get("limit")) || 50;
    const rawOffset = Number(url.searchParams.get("offset")) || 0;
    const limit = Math.max(1, Math.min(rawLimit, 100));
    const offset = Math.max(0, rawOffset);

    const context = await getSpaceContext(user.id);

    const where = {
      userId: user.id,
      ...(context.spaceId ? { spaceId: context.spaceId } : { spaceId: null }),
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: {
          userId: user.id,
          ...(context.spaceId ? { spaceId: context.spaceId } : { spaceId: null }),
          read: false,
        },
      }),
    ]);

    return NextResponse.json({ notifications, total, unreadCount });
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/mark-all-read — mark all notifications read
 * (Using POST on the collection route with action body)
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === "mark-all-read") {
      const context = await getSpaceContext(user.id);

      await db.notification.updateMany({
        where: {
          userId: user.id,
          ...(context.spaceId ? { spaceId: context.spaceId } : { spaceId: null }),
          read: false,
        },
        data: { read: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Failed to update notifications:", err);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
