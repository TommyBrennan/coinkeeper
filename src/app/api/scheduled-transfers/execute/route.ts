import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { executeDueScheduledTransfers } from "@/lib/execute-scheduled-transfer";

// POST /api/scheduled-transfers/execute — execute all due scheduled transfers
export async function POST() {
  const user = await requireUser();

  const result = await executeDueScheduledTransfers(user.id);

  return NextResponse.json({
    executed: result.executed.length,
    errors: result.errors.length,
    details: result,
  });
}
