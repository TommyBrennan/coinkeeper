"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/format";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  date: string;
  category: { id: string; name: string } | null;
  fromAccount: { id: string; name: string; currency: string } | null;
}

interface ParsedData {
  merchant: string | null;
  date: string | null;
  currency: string | null;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
}

interface Receipt {
  id: string;
  imagePath: string;
  merchant: string | null;
  total: number | null;
  currency: string | null;
  rawText: string | null;
  parsedData: ParsedData | null;
  processedAt: string | null;
  createdAt: string;
  transactions: Transaction[];
}

export function ReceiptDetail({ receiptId }: { receiptId: string }) {
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reParsing, setReParsing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/receipts/${receiptId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Receipt not found");
          } else {
            setError("Failed to load receipt");
          }
          return;
        }
        const data = await res.json();
        setReceipt(data.receipt);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [receiptId]);

  const handleReParse = async () => {
    setReParsing(true);
    setError(null);
    try {
      const res = await fetch(`/api/receipts/${receiptId}/parse`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Re-parse failed");
        return;
      }
      // Reload receipt data
      const detailRes = await fetch(`/api/receipts/${receiptId}`);
      if (detailRes.ok) {
        const data = await detailRes.json();
        setReceipt(data.receipt);
      }
    } catch {
      setError("Network error during re-parse");
    } finally {
      setReParsing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/receipts/${receiptId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Delete failed");
        setDeleting(false);
        return;
      }
      router.push("/receipts");
      router.refresh();
    } catch {
      setError("Network error during delete");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading receipt...
        </div>
      </div>
    );
  }

  if (error && !receipt) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Link
          href="/receipts"
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
        >
          Back to Receipts
        </Link>
      </div>
    );
  }

  if (!receipt) return null;

  const parsed = receipt.parsedData;
  const curr = receipt.currency || "USD";

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Receipt image + metadata */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Image */}
        <div className="shrink-0 md:w-72">
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receipt.imagePath}
              alt={receipt.merchant || "Receipt"}
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="flex-1 space-y-4">
          {/* Merchant + total */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {receipt.merchant || "Unknown Merchant"}
            </h2>
            {receipt.total !== null && (
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums mt-1">
                {formatMoney(receipt.total, curr)}
              </p>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </span>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                {parsed?.date
                  ? new Date(parsed.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { weekday: "short", month: "long", day: "numeric", year: "numeric" }
                    )
                  : new Date(receipt.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Currency
              </span>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                {curr}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </span>
              <p className="mt-0.5">
                {receipt.processedAt ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Parsed
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                    Pending
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Transactions
              </span>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                {receipt.transactions.length} linked
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleReParse}
              disabled={reParsing}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {reParsing ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Re-parsing...
                </span>
              ) : (
                "Re-parse Receipt"
              )}
            </button>
            <Link
              href="/receipts/new"
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Upload New
            </Link>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Line items */}
      {parsed?.lineItems && parsed.lineItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Line Items
          </h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">
                    Item
                  </th>
                  <th className="text-center px-3 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-16">
                    Qty
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-24">
                    Unit Price
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-24">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {parsed.lineItems.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100">
                      {item.name}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-gray-600 dark:text-gray-400">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                      {formatMoney(item.unitPrice, curr)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-900 dark:text-gray-100">
                      {formatMoney(item.totalPrice, curr)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 dark:border-gray-700">
                {parsed.subtotal !== null && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                      Subtotal
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">
                      {formatMoney(parsed.subtotal, curr)}
                    </td>
                  </tr>
                )}
                {parsed.tax !== null && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                      Tax
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">
                      {formatMoney(parsed.tax, curr)}
                    </td>
                  </tr>
                )}
                {parsed.total !== null && (
                  <tr className="font-semibold">
                    <td colSpan={3} className="px-4 py-2.5 text-right text-gray-900 dark:text-gray-100">
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-900 dark:text-gray-100">
                      {formatMoney(parsed.total, curr)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Linked transactions */}
      {receipt.transactions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Linked Transactions
          </h3>
          <div className="space-y-2">
            {receipt.transactions.map((txn) => (
              <Link
                key={txn.id}
                href="/transactions"
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                {/* Type icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    txn.type === "expense"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      : txn.type === "income"
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {txn.type === "expense" ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                    </svg>
                  )}
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {txn.description || "No description"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {txn.category && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {txn.category.name}
                      </span>
                    )}
                    {txn.fromAccount && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {txn.fromAccount.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(txn.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <span
                  className={`text-sm font-semibold tabular-nums shrink-0 ${
                    txn.type === "expense"
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {txn.type === "expense" ? "-" : "+"}
                  {formatMoney(txn.amount, txn.currency)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
