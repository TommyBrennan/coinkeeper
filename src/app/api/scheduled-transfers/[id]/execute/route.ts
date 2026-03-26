import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { executeScheduledTransfer } from "@/lib/execute-scheduled-transfer";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/scheduled-transfers/[id]/execute — manually execute a single scheduled transfer
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await requireUser();
  const { id } = await context.params;

  try {
    const result = await executeScheduledTransfer(id, user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message === "Scheduled transfer not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Scheduled transfer is paused") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
