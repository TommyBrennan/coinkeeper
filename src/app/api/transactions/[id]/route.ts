import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext, checkSpacePermission } from "@/lib/space-context";

/**
 * Check if a transaction is accessible to the user in the current context.
 * In personal context: transaction must belong to the user.
 * In space context: transaction must be on a space account the user has membership to.
 */
async function findAccessibleTransaction(
  transactionId: string,
  userId: string,
  context: { spaceId: string | null }
) {
  const transaction = await db.transaction.findFirst({
    where: { id: transactionId },
    include: {
      category: true,
      fromAccount: { select: { id: true, name: true, currency: true, color: true, spaceId: true } },
      toAccount: { select: { id: true, name: true, currency: true, color: true, spaceId: true } },
    },
  });

  if (!transaction) return null;

  if (context.spaceId) {
    // Space context: transaction must be linked to an account in this space
    const fromInSpace = transaction.fromAccount?.spaceId === context.spaceId;
    const toInSpace = transaction.toAccount?.spaceId === context.spaceId;
    if (!fromInSpace && !toInSpace) return null;
  } else {
    // Personal context: must be user's own transaction
    if (transaction.userId !== userId) return null;
  }

  return transaction;
}

// GET /api/transactions/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const context = await getSpaceContext(user.id);
  const transaction = await findAccessibleTransaction(id, user.id, context);

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
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const context = await getSpaceContext(user.id);

  // In space context, require editor role for deletion
  if (context.spaceId) {
    const perm = await checkSpacePermission(user.id, context.spaceId, "editor");
    if (!perm.allowed) {
      return NextResponse.json(
        { error: "Viewers cannot delete transactions in this space" },
        { status: 403 }
      );
    }
  }

  const existing = await findAccessibleTransaction(id, user.id, context);

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
