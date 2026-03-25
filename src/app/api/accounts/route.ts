import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/accounts — list all accounts for the current user
export async function GET() {
  const user = await getCurrentUser();

  const accounts = await db.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accounts);
}

// POST /api/accounts — create a new account
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  const body = await request.json();
  const { name, type, currency, balance, icon, color } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Account name is required" },
      { status: 400 }
    );
  }

  const validTypes = ["cash", "bank", "wallet", "credit"];
  if (!type || !validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Account type must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const account = await db.account.create({
    data: {
      userId: user.id,
      name: name.trim(),
      type,
      currency: currency || "USD",
      balance: typeof balance === "number" ? balance : 0,
      icon: icon || null,
      color: color || null,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
