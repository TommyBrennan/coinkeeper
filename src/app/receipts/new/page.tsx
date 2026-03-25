import Link from "next/link";
import { ReceiptUploadForm } from "@/components/receipt-upload-form";

export default function NewReceiptPage() {
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
        <span className="text-gray-900 dark:text-gray-100">Upload</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Scan Receipt
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upload a receipt image and AI will extract the items. Review and create
          transactions.
        </p>
      </div>

      <ReceiptUploadForm />
    </main>
  );
}
