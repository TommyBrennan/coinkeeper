import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// POST /api/categories/merge — merge source category into target
export async function POST(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json();

  const { sourceId, targetId } = body;

  if (!sourceId || !targetId) {
    return NextResponse.json(
      { error: "sourceId and targetId are required" },
      { status: 400 }
    );
  }

  if (sourceId === targetId) {
    return NextResponse.json(
      { error: "Cannot merge a category into itself" },
      { status: 400 }
    );
  }

  // Verify both categories belong to user
  const [source, target] = await Promise.all([
    db.category.findFirst({ where: { id: sourceId, userId: user.id } }),
    db.category.findFirst({ where: { id: targetId, userId: user.id } }),
  ]);

  if (!source) {
    return NextResponse.json(
      { error: "Source category not found" },
      { status: 404 }
    );
  }

  if (!target) {
    return NextResponse.json(
      { error: "Target category not found" },
      { status: 404 }
    );
  }

  // Move all transactions from source to target
  const updated = await db.transaction.updateMany({
    where: { categoryId: sourceId },
    data: { categoryId: targetId },
  });

  // Delete the source category
  await db.category.delete({
    where: { id: sourceId },
  });

  return NextResponse.json({
    merged: true,
    transactionsMoved: updated.count,
    deletedCategory: source.name,
    targetCategory: target.name,
  });
}
