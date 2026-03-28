import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { normalizeProductName } from "@/lib/products";

interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ParsedData {
  lineItems?: ReceiptLineItem[];
  [key: string]: unknown;
}

// POST /api/products/extract — extract products from all user's receipts
export async function POST() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all receipts that have parsedData, owned by the current user
  const receipts = await db.receipt.findMany({
    where: {
      userId: user.id,
      parsedData: { not: null },
    },
    select: {
      id: true,
      merchant: true,
      currency: true,
      parsedData: true,
      createdAt: true,
      transactions: {
        where: { userId: user.id },
        select: { date: true },
        take: 1,
      },
    },
  });

  let productsCreated = 0;
  let pricesCreated = 0;
  let skipped = 0;

  for (const receipt of receipts) {
    let parsed: ParsedData;
    try {
      parsed = JSON.parse(receipt.parsedData!) as ParsedData;
    } catch (err) {
      console.error(`Invalid parsedData JSON in receipt ${receipt.id}:`, err);
      skipped++;
      continue;
    }

    const lineItems = parsed.lineItems;
    if (!Array.isArray(lineItems) || lineItems.length === 0) continue;

    const receiptDate = receipt.transactions[0]?.date || receipt.createdAt;
    const currency = receipt.currency || "USD";
    const merchant = receipt.merchant || null;

    for (const item of lineItems) {
      if (!item.name || !item.unitPrice || item.unitPrice <= 0) {
        skipped++;
        continue;
      }

      const normalizedName = normalizeProductName(item.name);
      if (!normalizedName) {
        skipped++;
        continue;
      }

      // Check if we already have a price record for this receipt + product
      const existingPrice = await db.productPrice.findFirst({
        where: {
          receiptId: receipt.id,
          product: {
            userId: user.id,
            normalizedName,
          },
        },
      });

      if (existingPrice) {
        skipped++;
        continue;
      }

      // Upsert product
      const product = await db.product.upsert({
        where: {
          userId_normalizedName: {
            userId: user.id,
            normalizedName,
          },
        },
        create: {
          userId: user.id,
          name: item.name.trim(),
          normalizedName,
        },
        update: {},
      });

      // Create price record
      await db.productPrice.create({
        data: {
          productId: product.id,
          receiptId: receipt.id,
          merchant,
          unitPrice: item.unitPrice,
          currency,
          date: receiptDate,
        },
      });

      if (product.createdAt.getTime() > Date.now() - 1000) {
        productsCreated++;
      }
      pricesCreated++;
    }
  }

  return NextResponse.json({
    success: true,
    receiptsScanned: receipts.length,
    productsCreated,
    pricesCreated,
    skipped,
  });
}
