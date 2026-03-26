import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getTelegramLinkStatus, unlinkTelegram } from "@/lib/telegram";

export async function GET() {
  const { user, error } = await requireApiUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const link = await getTelegramLinkStatus(user.id);
  return NextResponse.json({
    linked: !!link,
    username: link?.username ?? null,
    linkedAt: link?.createdAt ?? null,
  });
}

export async function DELETE() {
  const { user, error } = await requireApiUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await unlinkTelegram(user.id);
  return NextResponse.json({ unlinked: true });
}
