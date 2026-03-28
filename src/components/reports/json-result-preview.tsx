"use client";

import type { JsonReportResult } from "./types";

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "emerald" | "red";
}) {
  const valueColor =
    color === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : color === "red"
        ? "text-red-600 dark:text-red-400"
        : "text-gray-900 dark:text-gray-100";

  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}

interface JsonResultPreviewProps {
  result: JsonReportResult;
  onClose: () => void;
}

export function JsonResultPreview({ result, onClose }: JsonResultPreviewProps) {
  return (
    <div className="mt-6 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Report: {result.report.name}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <SummaryCard
          label="Transactions"
          value={result.summary.totalTransactions.toString()}
        />
        <SummaryCard
          label="Income"
          value={`+${result.summary.totalIncome.toFixed(2)}`}
          color="emerald"
        />
        <SummaryCard
          label="Expenses"
          value={`-${result.summary.totalExpenses.toFixed(2)}`}
          color="red"
        />
        <SummaryCard
          label="Net"
          value={result.summary.netAmount.toFixed(2)}
          color={result.summary.netAmount >= 0 ? "emerald" : "red"}
        />
      </div>

      {/* Transactions table */}
      {result.transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">
                  Date
                </th>
                <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">
                  Type
                </th>
                <th className="text-right py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">
                  Amount
                </th>
                <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">
                  Description
                </th>
                <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">
                  Category
                </th>
              </tr>
            </thead>
            <tbody>
              {result.transactions.slice(0, 20).map((txn, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {txn.date as string}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                        txn.type === "income"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : txn.type === "expense"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {txn.type as string}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {(txn.amount as number).toFixed(2)}{" "}
                    <span className="text-gray-400 text-xs">
                      {txn.currency as string}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                    {(txn.description as string) || "\u2014"}
                  </td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">
                    {(txn.category as string) || "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.transactions.length > 20 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
              Showing 20 of {result.transactions.length} transactions
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No transactions match the report filters.
        </p>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Generated {new Date(result.report.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
