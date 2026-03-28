"use client";

import { useState } from "react";
import type { Account, Category, SavedReport, GeneratedReport } from "./types";
import { PERIOD_PRESETS } from "./types";
import { GeneratedReportsList } from "./generated-reports-list";

interface ReportCardProps {
  report: SavedReport;
  accounts: Account[];
  categories: Category[];
  generating: boolean;
  deleting: boolean;
  editingId: string | null;
  onGenerate: (report: SavedReport) => void;
  onEdit: (report: SavedReport) => void;
  onDelete: (id: string) => void;
}

function formatFilterSummary(
  filters: SavedReport["filters"],
  accounts: Account[],
  categories: Category[]
): string {
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

function formatSchedule(report: SavedReport): string {
  if (!report.scheduleEnabled || !report.scheduleFrequency) return "";
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  switch (report.scheduleFrequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return report.scheduleDay !== null
        ? `Weekly on ${dayNames[report.scheduleDay]}`
        : "Weekly";
    case "monthly": {
      if (report.scheduleDay !== null) {
        const s = ["th", "st", "nd", "rd"];
        const v = report.scheduleDay % 100;
        const suffix = s[(v - 20) % 10] || s[v] || s[0];
        return `Monthly on the ${report.scheduleDay}${suffix}`;
      }
      return "Monthly";
    }
    default:
      return report.scheduleFrequency;
  }
}

export function ReportCard({
  report,
  accounts,
  categories,
  generating,
  deleting,
  editingId,
  onGenerate,
  onEdit,
  onDelete,
}: ReportCardProps) {
  const [viewingGenerated, setViewingGenerated] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [loadingGenerated, setLoadingGenerated] = useState(false);

  async function loadGeneratedReports() {
    if (viewingGenerated) {
      setViewingGenerated(false);
      return;
    }
    setViewingGenerated(true);
    setLoadingGenerated(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/generated`);
      if (res.ok) {
        const data = await res.json();
        setGeneratedReports(data);
      }
    } catch {
      console.error("Failed to load generated reports");
    } finally {
      setLoadingGenerated(false);
    }
  }

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
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
            {formatFilterSummary(report.filters, accounts, categories)}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Last run: {formatDate(report.lastRunAt)}
            </p>
            {report.scheduleEnabled && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {formatSchedule(report)}
                {report.nextRunAt && (
                  <span className="text-gray-400 dark:text-gray-500">
                    · Next: {formatDate(report.nextRunAt)}
                  </span>
                )}
              </span>
            )}
            {report.generatedCount > 0 && (
              <button
                onClick={loadGeneratedReports}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {viewingGenerated ? "Hide" : "View"} history ({report.generatedCount})
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Generate button */}
          <button
            onClick={() => onGenerate(report)}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {generating ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            {generating ? "Generating..." : "Generate"}
          </button>

          {/* Edit button */}
          <button
            onClick={() => onEdit(report)}
            disabled={editingId === report.id}
            className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
          </button>

          {/* Delete button */}
          <button
            onClick={() => onDelete(report.id)}
            disabled={deleting}
            className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Generated reports history */}
      {viewingGenerated && (
        <GeneratedReportsList
          reportId={report.id}
          generatedReports={generatedReports}
          loading={loadingGenerated}
        />
      )}
    </div>
  );
}
