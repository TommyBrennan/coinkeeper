import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { categorizeTransaction } from "@/lib/categorize";
import { findSimilar, normalizeName } from "@/lib/category-normalize";

// POST /api/categorize — AI-powered category suggestion
export async function POST(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json();

  const { description, amount } = body;

  if (!description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    );
  }

  // Load user's existing categories
  const categories = await db.category.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // If user has no categories, seed defaults first
  if (categories.length === 0) {
    const DEFAULT_CATEGORIES = [
      { name: "Food & Dining", icon: "utensils", color: "#ef4444" },
      { name: "Transport", icon: "car", color: "#f97316" },
      { name: "Shopping", icon: "shopping-bag", color: "#a855f7" },
      { name: "Entertainment", icon: "film", color: "#ec4899" },
      { name: "Bills & Utilities", icon: "zap", color: "#eab308" },
      { name: "Health", icon: "heart", color: "#10b981" },
      { name: "Education", icon: "book", color: "#3b82f6" },
      { name: "Salary", icon: "briefcase", color: "#22c55e" },
      { name: "Freelance", icon: "laptop", color: "#06b6d4" },
      { name: "Investment", icon: "trending-up", color: "#8b5cf6" },
      { name: "Gift", icon: "gift", color: "#f472b6" },
      { name: "Bonus", icon: "star", color: "#fbbf24" },
      { name: "Rental Income", icon: "home", color: "#34d399" },
      { name: "Dividends", icon: "percent", color: "#818cf8" },
      { name: "Refund", icon: "rotate-ccw", color: "#fb923c" },
      { name: "Other", icon: "more-horizontal", color: "#6b7280" },
    ];

    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({
        userId: user.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
      })),
    });

    const seeded = await db.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    categories.push(...seeded);
  }

  // Load recent corrections for this user to help AI learn
  const corrections = await db.categoryCorrection.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Call AI categorization
  const result = await categorizeTransaction(
    description.trim(),
    categories,
    typeof amount === "number" ? amount : undefined,
    corrections.length > 0 ? corrections : undefined
  );

  // If AI suggested a new category, normalize and check for duplicates
  if (result.isNew && result.suggestedName) {
    const normalized = normalizeName(result.suggestedName);

    // Check for similar existing categories (fuzzy match + alias mapping)
    const similar = findSimilar(normalized, categories);

    if (similar) {
      // Found a similar existing category — use it instead of creating a duplicate
      result.categoryId = similar.id;
      result.suggestedName = similar.name;
      result.isNew = false;
    } else {
      // Check exact match (case-insensitive) as a fallback
      const existing = categories.find(
        (c) => c.name.toLowerCase() === normalized.toLowerCase()
      );

      if (existing) {
        result.categoryId = existing.id;
        result.suggestedName = existing.name;
        result.isNew = false;
      } else {
        // Create the new category with normalized name
        const newCategory = await db.category.create({
          data: {
            userId: user.id,
            name: normalized,
          },
        });
        result.categoryId = newCategory.id;
        result.suggestedName = normalized;
      }
    }
  }

  return NextResponse.json(result);
}
