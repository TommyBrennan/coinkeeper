import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { executeDueScheduledTransfers } from "@/lib/execute-scheduled-transfer";

// POST /api/scheduled-transfers/execute — execute all due scheduled transfers
export async function POST() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await executeDueScheduledTransfers(user.id);

    return NextResponse.json({
      executed: result.executed.length,
      errors: result.errors.length,
      details: result,
    });
  } catch (err) {
    console.error("Scheduled transfer execution error:", err);
    return NextResponse.json(
      { error: "Failed to execute scheduled transfers" },
      { status: 500 }
    );
  }
}
