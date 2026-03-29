import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { executeDueRecurringIncome } from "@/lib/execute-recurring-income";

// POST /api/recurring-income/execute — execute all due recurring income rules
export async function POST() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await executeDueRecurringIncome(user.id);

    return NextResponse.json({
      executed: result.executed.length,
      errors: result.errors.length,
      details: result,
    });
  } catch (err) {
    console.error("Recurring income execution error:", err);
    return NextResponse.json(
      { error: "Failed to execute recurring income" },
      { status: 500 }
    );
  }
}
