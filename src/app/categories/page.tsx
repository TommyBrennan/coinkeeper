import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CategoryManager } from "@/components/category-manager";

export default async function CategoriesPage() {
  const user = await requireUser();

  const categories = await db.category.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Categories
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your transaction categories. Rename, merge, or delete
            categories to keep things organized.
          </p>
        </div>
      </div>

      <CategoryManager
        initialCategories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          transactionCount: c._count.transactions,
        }))}
      />
    </div>
  );
}
