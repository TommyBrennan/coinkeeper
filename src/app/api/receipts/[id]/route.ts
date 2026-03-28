import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// GET /api/receipts/[id] — get a single receipt with parsed data and linked transactions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const receipt = await db.receipt.findUnique({
    where: { id, userId: user.id },
    include: {
      transactions: {
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          description: true,
          date: true,
          category: { select: { id: true, name: true } },
          fromAccount: { select: { id: true, name: true, currency: true } },
        },
      },
    },
  });

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  // Parse the stored JSON data
  let parsedData = null;
  if (receipt.parsedData) {
    try {
      parsedData = JSON.parse(receipt.parsedData);
    } catch {
      parsedData = null;
    }
  }

  return NextResponse.json({
    receipt: {
      ...receipt,
      parsedData,
    },
  });
}

// DELETE /api/receipts/[id] — delete a receipt record (does not delete linked transactions)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const receipt = await db.receipt.findUnique({ where: { id, userId: user.id } });
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  // Unlink any transactions that reference this receipt
  await db.transaction.updateMany({
    where: { receiptId: id },
    data: { receiptId: null },
  });

  await db.receipt.delete({ where: { id, userId: user.id } });

  return NextResponse.json({ success: true });
}
