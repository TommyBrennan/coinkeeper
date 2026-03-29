import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor");

  const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 100);

  const entries = await db.auditLog.findMany({
    where: {
      userId: user.id,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // fetch one extra to determine if there's a next page
  });

  let nextCursor: string | undefined;
  if (entries.length > limit) {
    entries.pop();
    const last = entries[entries.length - 1];
    nextCursor = last.createdAt.toISOString();
  }

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      action: e.action,
      metadata: e.metadata ? JSON.parse(e.metadata) : null,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      createdAt: e.createdAt.toISOString(),
    })),
    nextCursor,
  });
}
