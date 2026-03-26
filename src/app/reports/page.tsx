import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSpaceContext, getSpaceAccountIds } from "@/lib/space-context";
import { ReportsManager } from "@/components/reports-manager";

export const metadata = {
  title: "Reports — CoinKeeper",
};

export default async function ReportsPage() {
  const user = await requireUser();
  const context = await getSpaceContext(user.id);

  // Fetch accounts for filter dropdown
  let accounts;
  if (context.spaceId) {
    const spaceAccountIds = await getSpaceAccountIds(context.spaceId);
    accounts = spaceAccountIds.length > 0
      ? await db.account.findMany({
          where: { id: { in: spaceAccountIds } },
          select: { id: true, name: true, currency: true },
          orderBy: { name: "asc" },
        })
      : [];
  } else {
    accounts = await db.account.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, currency: true },
      orderBy: { name: "asc" },
    });
  }

  // Fetch categories for filter dropdown
  const categories = await db.category.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      <ReportsManager accounts={accounts} categories={categories} />
    </main>
  );
}
