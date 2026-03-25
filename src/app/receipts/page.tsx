import Link from "next/link";
import { ReceiptList } from "@/components/receipt-list";

export default function ReceiptsPage() {
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
        <span className="text-gray-900 dark:text-gray-100">Receipts</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Receipts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload and manage scanned receipts
          </p>
        </div>
        <Link
          href="/receipts/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
          Upload Receipt
        </Link>
      </div>

      <ReceiptList />
    </main>
  );
}
