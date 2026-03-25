import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizeName } from "@/lib/category-normalize";

// PATCH /api/categories/[id] — rename a category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const body = await request.json();

  const { name } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const normalized = normalizeName(name);

  // Verify category belongs to user
  const category = await db.category.findFirst({
    where: { id, userId: user.id },
  });

  if (!category) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    );
  }

  // Check for duplicate name
  const existing = await db.category.findFirst({
    where: {
      userId: user.id,
      name: { equals: normalized },
      id: { not: id },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: `A category named "${existing.name}" already exists` },
      { status: 409 }
    );
  }

  const updated = await db.category.update({
    where: { id },
    data: { name: normalized },
  });

  return NextResponse.json(updated);
}

// DELETE /api/categories/[id] — delete a category (unset from transactions)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  // Verify category belongs to user
  const category = await db.category.findFirst({
    where: { id, userId: user.id },
  });

  if (!category) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    );
  }

  // Unset categoryId from all transactions using this category
  await db.transaction.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });

  // Delete the category
  await db.category.delete({
    where: { id },
  });

  return NextResponse.json({ deleted: true });
}
