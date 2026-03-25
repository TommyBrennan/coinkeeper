import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const DEFAULT_CATEGORIES = [
  // Expense categories
  { name: "Food & Dining", icon: "utensils", color: "#ef4444" },
  { name: "Transport", icon: "car", color: "#f97316" },
  { name: "Shopping", icon: "shopping-bag", color: "#a855f7" },
  { name: "Entertainment", icon: "film", color: "#ec4899" },
  { name: "Bills & Utilities", icon: "zap", color: "#eab308" },
  { name: "Health", icon: "heart", color: "#10b981" },
  { name: "Education", icon: "book", color: "#3b82f6" },
  // Income categories
  { name: "Salary", icon: "briefcase", color: "#22c55e" },
  { name: "Freelance", icon: "laptop", color: "#06b6d4" },
  { name: "Investment", icon: "trending-up", color: "#8b5cf6" },
  { name: "Gift", icon: "gift", color: "#f472b6" },
  { name: "Bonus", icon: "star", color: "#fbbf24" },
  { name: "Rental Income", icon: "home", color: "#34d399" },
  { name: "Dividends", icon: "percent", color: "#818cf8" },
  { name: "Refund", icon: "rotate-ccw", color: "#fb923c" },
  // General
  { name: "Other", icon: "more-horizontal", color: "#6b7280" },
];

// GET /api/categories — list categories, seeding defaults if empty
export async function GET() {
  const user = await getCurrentUser();

  let categories = await db.category.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  // Seed defaults if user has no categories
  if (categories.length === 0) {
    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({
        userId: user.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
      })),
    });

    categories = await db.category.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });
  }

  return NextResponse.json(categories);
}
