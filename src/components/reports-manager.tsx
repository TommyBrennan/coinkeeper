"use client";

import { useState, useEffect, useCallback } from "react";

interface Account {
  id: string;
  name: string;
  currency: string;
}

interface Category {
  id: string;
  name: string;
}

interface ReportFilters {
  type?: string;
  accountId?: string;
  categoryId?: string;
  periodPreset?: string;
  from?: string;
  to?: string;
}

interface SavedReport {
  id: string;
  name: string;
  description: string | null;
  format: string;
  filters: ReportFilters;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JsonReportResult {
  report: { name: string; generatedAt: string };
  summary: {
    totalTransactions: number;
    totalExpenses: number;
    totalIncome: number;
    totalTransfers: number;
    netAmount: number;
  };
  transactions: Array<Record<string, unknown>>;
}

interface ReportsManagerProps {
  accounts: Account[];
  categories: Category[];
}

const PERIOD_PRESETS = [
  { value: "", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
];

const TRANSACTION_TYPES = [
  { value: "", label: "All types" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfers" },
];

export function ReportsManager({ accounts, categories }: ReportsManagerProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [jsonResult, setJsonResult] = useState<JsonReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFormat, setFormFormat] = useState("csv");
  const [formType, setFormType] = useState("");
  const [formAccountId, setFormAccountId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formPeriodPreset, setFormPeriodPreset] = useState("");

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch {
      console.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormFormat("csv");
    setFormType("");
    setFormAccountId("");
    setFormCategoryId("");
    setFormPeriodPreset("");
  }

  function populateForm(report: SavedReport) {
    setFormName(report.name);
    setFormDescription(report.description || "");
    setFormFormat(report.format);
    setFormType(report.filters.type || "");
    setFormAccountId(report.filters.accountId || "");
    setFormCategoryId(report.filters.categoryId || "");
    setFormPeriodPreset(report.filters.periodPreset || "");
  }

  function buildFilters(): ReportFilters {
    const filters: ReportFilters = {};
    if (formType) filters.type = formType;
    if (formAccountId) filters.accountId = formAccountId;
    if (formCategoryId) filters.categoryId = formCategoryId;
    if (formPeriodPreset) filters.periodPreset = formPeriodPreset;
    return filters;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formName.trim()) {
      setError("Report name is required");
      return;
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          format: formFormat,
          filters: buildFilters(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create report");
        return;
      }

      resetForm();
      setShowCreate(false);
      await fetchReports();
    } catch {
      setError("Failed to create report");
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);

    if (!formName.trim()) {
      setError("Report name is required");
      return;
    }

    try {
      const res = await fetch(`/api/reports/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          format: formFormat,
          filters: buildFilters(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update report");
        return;
      }

      setEditingId(null);
      resetForm();
      await fetchReports();
    } catch {
      setError("Failed to update report");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this report template?")) return;
    setDeleting(id);

    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
        if (editingId === id) {
          setEditingId(null);
          resetForm();
        }
      }
    } catch {
      console.error("Failed to delete report");
    } finally {
      setDeleting(null);
    }
  }

  async function handleGenerate(report: SavedReport) {
    setGenerating(report.id);
    setJsonResult(null);

    try {
      const res = await fetch(`/api/reports/${report.id}/generate`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate report");
        return;
      }

      if (report.format === "csv") {
        // Download CSV file
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          res.headers
            .get("Content-Disposition")
            ?.match(/filename="(.+)"/)?.[1] || "report.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Update lastRunAt in local state
        setReports((prev) =>
          prev.map((r) =>
            r.id === report.id
              ? { ...r, lastRunAt: new Date().toISOString() }
              : r
          )
        );
      } else {
        // Show JSON result inline
        const data: JsonReportResult = await res.json();
        setJsonResult(data);

        // Update lastRunAt in local state
        setReports((prev) =>
          prev.map((r) =>
            r.id === report.id
              ? { ...r, lastRunAt: new Date().toISOString() }
              : r
          )
        );
      }
    } catch {
      setError("Failed to generate report");
    } finally {
      setGenerating(null);
    }
  }

  function startEdit(report: SavedReport) {
    setEditingId(report.id);
    populateForm(report);
    setShowCreate(false);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    resetForm();
    setError(null);
  }

  function formatFilterSummary(filters: ReportFilters): string {
    const parts: string[] = [];
    if (filters.type) {
      parts.push(filters.type.charAt(0).toUpperCase() + filters.type.slice(1) + "s");
    }
    if (filters.accountId) {
      const account = accounts.find((a) => a.id === filters.accountId);
      if (account) parts.push(account.name);
    }
    if (filters.categoryId) {
      const category = categories.find((c) => c.id === filters.categoryId);
      if (category) parts.push(category.name);
    }
    if (filters.periodPreset) {
      const preset = PERIOD_PRESETS.find((p) => p.value === filters.periodPreset);
      if (preset) parts.push(preset.label);
    }
    return parts.length > 0 ? parts.join(" · ") : "No filters (all transactions)";
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Reports
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {reports.length === 0
              ? "No saved reports yet"
              : `${reports.length} saved report${reports.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {!showCreate && !editingId && (
          <button
            onClick={() => {
              setShowCreate(true);
              resetForm();
              setError(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            New Report
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700 dark:hover:text-red-300"
          >
            &times;
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Create Report Template
          </h2>
          <ReportForm
            name={formName}
            description={formDescription}
            format={formFormat}
            type={formType}
            accountId={formAccountId}
            categoryId={formCategoryId}
            periodPreset={formPeriodPreset}
            accounts={accounts}
            categories={categories}
            onNameChange={setFormName}
            onDescriptionChange={setFormDescription}
            onFormatChange={setFormFormat}
            onTypeChange={setFormType}
            onAccountIdChange={setFormAccountId}
            onCategoryIdChange={setFormCategoryId}
            onPeriodPresetChange={setFormPeriodPreset}
            onSubmit={handleCreate}
            onCancel={() => {
              setShowCreate(false);
              resetForm();
              setError(null);
            }}
            submitLabel="Create Report"
          />
        </div>
      )}

      {/* Edit Form */}
      {editingId && (
        <div className="mb-6 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Edit Report
          </h2>
          <ReportForm
            name={formName}
            description={formDescription}
            format={formFormat}
            type={formType}
            accountId={formAccountId}
            categoryId={formCategoryId}
            periodPreset={formPeriodPreset}
            accounts={accounts}
            categories={categories}
            onNameChange={setFormName}
            onDescriptionChange={setFormDescription}
            onFormatChange={setFormFormat}
            onTypeChange={setFormType}
            onAccountIdChange={setFormAccountId}
            onCategoryIdChange={setFormCategoryId}
            onPeriodPresetChange={setFormPeriodPreset}
            onSubmit={handleUpdate}
            onCancel={cancelEdit}
            submitLabel="Save Changes"
          />
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 && !showCreate ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            No saved reports
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Create report templates with filters you use often for quick data exports.
          </p>
          <button
            onClick={() => {
              setShowCreate(true);
              resetForm();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Create Your First Report
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {report.name}
                    </h3>
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase">
                      {report.format}
                    </span>
                  </div>
                  {report.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {report.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatFilterSummary(report.filters)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Last run: {formatDate(report.lastRunAt)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Generate button */}
                  <button
                    onClick={() => handleGenerate(report)}
                    disabled={generating === report.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {generating === report.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                        />
                      </svg>
                    )}
                    {generating === report.id ? "Generating..." : "Generate"}
                  </button>

                  {/* Edit button */}
                  <button
                    onClick={() => startEdit(report)}
                    disabled={editingId === report.id}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                      />
                    </svg>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(report.id)}
                    disabled={deleting === report.id}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deleting === report.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* JSON Result Preview */}
      {jsonResult && (
        <div className="mt-6 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Report: {jsonResult.report.name}
            </h3>
            <button
              onClick={() => setJsonResult(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard
              label="Transactions"
              value={jsonResult.summary.totalTransactions.toString()}
            />
            <SummaryCard
              label="Income"
              value={`+${jsonResult.summary.totalIncome.toFixed(2)}`}
              color="emerald"
            />
            <SummaryCard
              label="Expenses"
              value={`-${jsonResult.summary.totalExpenses.toFixed(2)}`}
              color="red"
            />
            <SummaryCard
              label="Net"
              value={jsonResult.summary.netAmount.toFixed(2)}
              color={jsonResult.summary.netAmount >= 0 ? "emerald" : "red"}
            />
          </div>

          {/* Transactions table */}
          {jsonResult.transactions.length > 0 ? (
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
                  {jsonResult.transactions.slice(0, 20).map((txn, i) => (
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
                        {(txn.description as string) || "—"}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {(txn.category as string) || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {jsonResult.transactions.length > 20 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  Showing 20 of {jsonResult.transactions.length} transactions
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No transactions match the report filters.
            </p>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Generated {new Date(jsonResult.report.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

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

function ReportForm({
  name,
  description,
  format,
  type,
  accountId,
  categoryId,
  periodPreset,
  accounts,
  categories,
  onNameChange,
  onDescriptionChange,
  onFormatChange,
  onTypeChange,
  onAccountIdChange,
  onCategoryIdChange,
  onPeriodPresetChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  name: string;
  description: string;
  format: string;
  type: string;
  accountId: string;
  categoryId: string;
  periodPreset: string;
  accounts: Account[];
  categories: Category[];
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onFormatChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onAccountIdChange: (v: string) => void;
  onCategoryIdChange: (v: string) => void;
  onPeriodPresetChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors";
  const labelClass =
    "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Monthly Expenses"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Format</label>
          <select
            value={format}
            onChange={(e) => onFormatChange(e.target.value)}
            className={inputClass}
          >
            <option value="csv">CSV (download)</option>
            <option value="json">JSON (preview)</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Optional description"
          className={inputClass}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filters
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
              className={inputClass}
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Account
            </label>
            <select
              value={accountId}
              onChange={(e) => onAccountIdChange(e.target.value)}
              className={inputClass}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => onCategoryIdChange(e.target.value)}
              className={inputClass}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Period
            </label>
            <select
              value={periodPreset}
              onChange={(e) => onPeriodPresetChange(e.target.value)}
              className={inputClass}
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
