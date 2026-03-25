"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";

interface ReceiptSummary {
  id: string;
  imagePath: string;
  merchant: string | null;
  total: number | null;
  currency: string | null;
  processedAt: string | null;
  createdAt: string;
  transactions: Array<{
    id: string;
    description: string | null;
    amount: number;
    type: string;
  }>;
}

export function ReceiptList() {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 12;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/receipts?limit=${limit}&offset=${offset}`
        );
        if (!res.ok) throw new Error("Failed to load receipts");
        const data = await res.json();
        setReceipts(data.receipts);
        setTotal(data.total);
      } catch {
        setError("Failed to load receipts");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [offset]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading receipts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
        {error}
      </div>
    );
  }

  if (receipts.length === 0 && offset === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
        <svg
          className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          No receipts yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Upload your first receipt to start tracking expenses automatically.
        </p>
        <Link
          href="/receipts/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          Upload Receipt
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      {/* Receipt grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {receipts.map((receipt) => (
          <Link
            key={receipt.id}
            href={`/receipts/${receipt.id}`}
            className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all"
          >
            {/* Thumbnail */}
            <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receipt.imagePath}
                alt={receipt.merchant || "Receipt"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {receipt.merchant || "Unknown merchant"}
                </h3>
                {receipt.total !== null && receipt.currency && (
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                    {formatMoney(receipt.total, receipt.currency)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(receipt.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>

                <div className="flex items-center gap-1">
                  {receipt.processedAt ? (
                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                      Parsed
                    </span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      Pending
                    </span>
                  )}

                  {receipt.transactions.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      {receipt.transactions.length} txn
                      {receipt.transactions.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
