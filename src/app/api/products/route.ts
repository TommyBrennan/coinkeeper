import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/products — list/search products with latest prices
export async function GET(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const where: Record<string, unknown> = {
    userId: user.id,
  };

  if (query) {
    where.normalizedName = {
      contains: query.toLowerCase().trim(),
    };
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        prices: {
          orderBy: { date: "desc" },
          take: 1,
          select: {
            unitPrice: true,
            currency: true,
            merchant: true,
            date: true,
          },
        },
        _count: {
          select: { prices: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.product.count({ where }),
  ]);

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    normalizedName: p.normalizedName,
    latestPrice: p.prices[0] || null,
    observationCount: p._count.prices,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return NextResponse.json({ data, total, limit, offset });
}
