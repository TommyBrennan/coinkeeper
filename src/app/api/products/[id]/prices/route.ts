import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/products/[id]/prices — price history for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify product belongs to user
  const product = await db.product.findFirst({
    where: { id, userId: user.id },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const merchant = searchParams.get("merchant");

  const where: Record<string, unknown> = {
    productId: id,
  };

  if (merchant) {
    where.merchant = merchant;
  }

  const prices = await db.productPrice.findMany({
    where,
    orderBy: { date: "desc" },
    select: {
      id: true,
      unitPrice: true,
      currency: true,
      merchant: true,
      date: true,
      receiptId: true,
    },
  });

  // Compute stats
  const unitPrices = prices.map((p) => p.unitPrice);
  const merchants = [...new Set(prices.map((p) => p.merchant).filter(Boolean))];

  const stats = {
    count: prices.length,
    avgPrice: unitPrices.length > 0
      ? unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length
      : 0,
    minPrice: unitPrices.length > 0 ? Math.min(...unitPrices) : 0,
    maxPrice: unitPrices.length > 0 ? Math.max(...unitPrices) : 0,
    merchantCount: merchants.length,
    merchants,
  };

  return NextResponse.json({
    product: {
      id: product.id,
      name: product.name,
      normalizedName: product.normalizedName,
    },
    prices,
    stats,
  });
}
