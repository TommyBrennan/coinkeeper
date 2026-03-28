"use client";

import { formatMoney } from "@/lib/format";
import type { Account, Category, LineItem } from "./types";
import { LineItemRow } from "./line-item-row";

interface ReceiptReviewProps {
  previewUrl: string | null;
  merchant: string;
  setMerchant: (v: string) => void;
  receiptDate: string;
  setReceiptDate: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  lineItems: LineItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  selectedTotal: number;
  selectedCount: number;
  accountId: string;
  setAccountId: (v: string) => void;
  accounts: Account[];
  categories: Category[];
  suggestingIndex: number | null;
  submitting: boolean;
  reParsing: boolean;
  receiptId: string | null;
  onUpdateLineItem: (index: number, field: keyof LineItem, value: unknown) => void;
  onRemoveLineItem: (index: number) => void;
  onAddLineItem: () => void;
  onSuggestAllCategories: () => void;
  onCreateTransactions: () => void;
  onReParse: () => void;
  onReset: () => void;
}

export function ReceiptReview({
  previewUrl,
  merchant,
  setMerchant,
  receiptDate,
  setReceiptDate,
  currency,
  setCurrency,
  lineItems,
  subtotal,
  tax,
  total,
  selectedTotal,
  selectedCount,
  accountId,
  setAccountId,
  accounts,
  categories,
  suggestingIndex,
  submitting,
  reParsing,
  receiptId,
  onUpdateLineItem,
  onRemoveLineItem,
  onAddLineItem,
  onSuggestAllCategories,
  onCreateTransactions,
  onReParse,
  onReset,
}: ReceiptReviewProps) {
  return (
    <div className="space-y-6">
      {/* Receipt image + info side by side */}
      <div className="flex gap-6">
        {previewUrl && (
          <div className="shrink-0 w-40 h-52 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Receipt"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 space-y-4">
          {/* Merchant */}
          <div>
            <label
              htmlFor="receipt-merchant"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Merchant
            </label>
            <input
              id="receipt-merchant"
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Store name"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          {/* Date */}
          <div>
            <label
              htmlFor="receipt-date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Date
            </label>
            <input
              id="receipt-date"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          {/* Currency */}
          <div>
            <label
              htmlFor="receipt-currency"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Currency
            </label>
            <input
              id="receipt-currency"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              placeholder="USD"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Line Items
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSuggestAllCategories}
              disabled={suggestingIndex !== null}
              className="text-xs px-2.5 py-1 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 font-medium transition-colors disabled:opacity-50"
            >
              {suggestingIndex !== null ? (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3 h-3 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Suggesting...
                </span>
              ) : (
                "AI Categorize All"
              )}
            </button>
            <button
              type="button"
              onClick={onAddLineItem}
              className="text-xs px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
            >
              + Add Item
            </button>
          </div>
        </div>

        {lineItems.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              No line items parsed from receipt
            </p>
            <button
              type="button"
              onClick={onAddLineItem}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              Add items manually
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {lineItems.map((item, index) => (
              <LineItemRow
                key={index}
                item={item}
                index={index}
                currency={currency}
                categories={categories}
                suggestingIndex={suggestingIndex}
                onUpdate={onUpdateLineItem}
                onRemove={onRemoveLineItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Totals summary */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-2">
        {subtotal !== null && (
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Subtotal (receipt)</span>
            <span className="tabular-nums">
              {formatMoney(subtotal, currency)}
            </span>
          </div>
        )}
        {tax !== null && (
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Tax (receipt)</span>
            <span className="tabular-nums">
              {formatMoney(tax, currency)}
            </span>
          </div>
        )}
        {total !== null && (
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Total (receipt)</span>
            <span className="tabular-nums font-medium">
              {formatMoney(total, currency)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm font-semibold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-2">
          <span>Selected items total</span>
          <span className="tabular-nums">
            {formatMoney(selectedTotal, currency)}
          </span>
        </div>
      </div>

      {/* Account selection */}
      <div>
        <label
          htmlFor="receipt-account"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Debit Account
        </label>
        <select
          id="receipt-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency}) — {formatMoney(a.balance, a.currency)}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onCreateTransactions}
          disabled={submitting || selectedCount === 0}
          className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creating Transactions...
            </span>
          ) : (
            `Create ${selectedCount} Transaction${selectedCount !== 1 ? "s" : ""}`
          )}
        </button>
        <button
          type="button"
          onClick={onReParse}
          disabled={reParsing || !receiptId}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {reParsing ? "Re-parsing..." : "Re-parse Receipt"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Upload Different
        </button>
      </div>
    </div>
  );
}
