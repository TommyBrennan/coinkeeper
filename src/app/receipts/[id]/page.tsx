import Link from "next/link";
import { ReceiptDetail } from "@/components/receipt-detail";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link
          href="/"
          className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          Home
        </Link>
        <span>/</span>
        <Link
          href="/receipts"
          className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          Receipts
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Detail</span>
      </nav>

      <ReceiptDetail receiptId={id} />
    </main>
  );
}
