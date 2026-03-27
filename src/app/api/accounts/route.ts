import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext } from "@/lib/space-context";
import { parseAndValidateBody } from "@/lib/api-utils";
import { createAccountSchema } from "@/lib/validations";

// GET /api/accounts — list accounts for the current context (personal or space)
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getSpaceContext(user.id);

  let accounts;
  if (context.spaceId) {
    // Space context — show all accounts in this space
    accounts = await db.account.findMany({
      where: { spaceId: context.spaceId },
      orderBy: { createdAt: "desc" },
    });
  } else {
    // Personal context — only personal accounts (no spaceId)
    accounts = await db.account.findMany({
      where: { userId: user.id, spaceId: null },
      orderBy: { createdAt: "desc" },
    });
  }

  return NextResponse.json(accounts);
}

// POST /api/accounts — create a new account
export async function POST(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: parseError } = await parseAndValidateBody(request, createAccountSchema);
  if (parseError) return parseError;
  const { name, type, currency, balance, icon, color, lowBalanceThreshold } = body;

  const context = await getSpaceContext(user.id);

  // If in space context, validate role
  if (context.spaceId) {
    if (context.role === "viewer") {
      return NextResponse.json(
        { error: "Viewers cannot create accounts in this space" },
        { status: 403 }
      );
    }
  }

  const account = await db.account.create({
    data: {
      userId: user.id,
      spaceId: context.spaceId,
      name: name.trim(),
      type,
      currency: currency || "USD",
      balance: balance ?? 0,
      icon: icon || null,
      color: color || null,
      lowBalanceThreshold: lowBalanceThreshold ?? null,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
