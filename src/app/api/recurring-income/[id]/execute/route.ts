import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { executeRecurringIncome } from "@/lib/execute-recurring-income";

// POST /api/recurring-income/[id]/execute — execute a single recurring income rule
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await executeRecurringIncome(id, user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message === "Recurring rule not found" || message === "No income transaction found for this recurring rule") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Recurring rule is not active" || message === "Recurring income has no target account") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("Recurring income execution error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
