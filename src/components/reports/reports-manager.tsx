"use client";

import { useState, useEffect, useCallback } from "react";
import type { Account, Category, SavedReport, JsonReportResult } from "./types";
import { useReportForm } from "./use-report-form";
import { ReportForm } from "./report-form";
import { ReportCard } from "./report-card";
import { JsonResultPreview } from "./json-result-preview";

interface ReportsManagerProps {
  accounts: Account[];
  categories: Category[];
}

export function ReportsManager({ accounts, categories }: ReportsManagerProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [jsonResult, setJsonResult] = useState<JsonReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { formState, updateField, resetForm, populateForm, buildPayload } = useReportForm();

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formState.name.trim()) {
      setError("Report name is required");
      return;
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
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

    if (!formState.name.trim()) {
      setError("Report name is required");
      return;
    }

    try {
      const res = await fetch(`/api/reports/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildPayload(),
          description: formState.description.trim() || null,
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

      if (report.format === "csv" || report.format === "pdf") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const defaultName = report.format === "pdf" ? "report.pdf" : "report.csv";
        a.download =
          res.headers
            .get("Content-Disposition")
            ?.match(/filename="(.+)"/)?.[1] || defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setReports((prev) =>
          prev.map((r) =>
            r.id === report.id
              ? { ...r, lastRunAt: new Date().toISOString() }
              : r
          )
        );
      } else {
        const data: JsonReportResult = await res.json();
        setJsonResult(data);

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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
            formState={formState}
            accounts={accounts}
            categories={categories}
            onFieldChange={updateField}
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
            formState={formState}
            accounts={accounts}
            categories={categories}
            onFieldChange={updateField}
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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Your First Report
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              accounts={accounts}
              categories={categories}
              generating={generating === report.id}
              deleting={deleting === report.id}
              editingId={editingId}
              onGenerate={handleGenerate}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* JSON Result Preview */}
      {jsonResult && (
        <JsonResultPreview
          result={jsonResult}
          onClose={() => setJsonResult(null)}
        />
      )}
    </div>
  );
}
