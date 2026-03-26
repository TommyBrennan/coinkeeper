import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// GET /api/transactions/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const transaction = await db.transaction.findFirst({
    where: { id, userId: user.id },
    include: {
      category: true,
      fromAccount: { select: { id: true, name: true, currency: true, color: true } },
      toAccount: { select: { id: true, name: true, currency: true, color: true } },
    },
  });

  if (!transaction) {
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(transaction);
}

// DELETE /api/transactions/[id] — delete and revert balance
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const existing = await db.transaction.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 }
    );
  }

  // Delete and revert balance atomically
  await db.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { id } });

    // Revert account balances
    if (existing.type === "expense" && existing.fromAccountId) {
      await tx.account.update({
        where: { id: existing.fromAccountId },
        data: { balance: { increment: existing.amount } },
      });
    } else if (existing.type === "income" && existing.toAccountId) {
      await tx.account.update({
        where: { id: existing.toAccountId },
        data: { balance: { decrement: existing.amount } },
      });
    } else if (existing.type === "transfer") {
      if (existing.fromAccountId) {
        await tx.account.update({
          where: { id: existing.fromAccountId },
          data: { balance: { increment: existing.amount } },
        });
      }
      if (existing.toAccountId) {
        // Revert the destination with toAmount (converted amount), fallback to amount
        const revertAmount = existing.toAmount ?? existing.amount;
        await tx.account.update({
          where: { id: existing.toAccountId },
          data: { balance: { decrement: revertAmount } },
        });
      }
    }
  });

  return new NextResponse(null, { status: 204 });
}
