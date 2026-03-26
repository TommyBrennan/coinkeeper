import { requireUser } from "@/lib/auth";
import { ProductPriceList } from "@/components/product-price-list";

export default async function PricesPage() {
  await requireUser();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Product Prices
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track product prices across stores from your scanned receipts
        </p>
      </div>

      <ProductPriceList />
    </div>
  );
}
