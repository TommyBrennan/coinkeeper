import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseAndValidateBody } from "@/lib/api-utils";
import { updateAccountSchema } from "@/lib/validations";

// GET /api/accounts/[id] — get a single account
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
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
  const user = await requireUser();
  const { id } = await params;

  const existing = await db.account.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const { data: body, error: parseError } = await parseAndValidateBody(request, updateAccountSchema);
  if (parseError) return parseError;
  const { name, type, currency, balance, icon, color, isArchived, lowBalanceThreshold } = body;

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
      ...(lowBalanceThreshold !== undefined && {
        lowBalanceThreshold: lowBalanceThreshold ?? null,
      }),
    },
  });

  return NextResponse.json(account);
}

// DELETE /api/accounts/[id] — delete an account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
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
