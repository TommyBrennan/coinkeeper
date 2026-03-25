import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/accounts/[id] — get a single account
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const account = await db.account.findFirst({
    where: { id, userId: user.id },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(account);
}

// PATCH /api/accounts/[id] — update an account
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const existing = await db.account.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, type, currency, balance, icon, color, isArchived } = body;

  const validTypes = ["cash", "bank", "wallet", "credit"];
  if (type !== undefined && !validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Account type must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const account = await db.account.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(type !== undefined && { type }),
      ...(currency !== undefined && { currency }),
      ...(balance !== undefined && { balance }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
      ...(isArchived !== undefined && { isArchived }),
    },
  });

  return NextResponse.json(account);
}

// DELETE /api/accounts/[id] — delete an account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const existing = await db.account.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  await db.account.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
