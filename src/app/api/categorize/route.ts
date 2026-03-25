import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { categorizeTransaction } from "@/lib/categorize";

// POST /api/categorize — AI-powered category suggestion
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
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
    // Trigger category seeding by calling the categories endpoint logic
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

  // Call AI categorization
  const result = await categorizeTransaction(
    description.trim(),
    categories,
    typeof amount === "number" ? amount : undefined
  );

  // If AI suggested a new category, create it
  if (result.isNew && result.suggestedName) {
    // Check for duplicate (case-insensitive)
    const existing = categories.find(
      (c) => c.name.toLowerCase() === result.suggestedName!.toLowerCase()
    );

    if (existing) {
      // Already exists — use existing
      result.categoryId = existing.id;
      result.isNew = false;
    } else {
      // Create the new category
      const newCategory = await db.category.create({
        data: {
          userId: user.id,
          name: result.suggestedName,
        },
      });
      result.categoryId = newCategory.id;
    }
  }

  return NextResponse.json(result);
}
