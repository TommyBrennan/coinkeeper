"use client";

import type { GeneratedReport } from "./types";

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

async function downloadGeneratedReport(
  reportId: string,
  genId: string,
  fileName: string | null,
  format: string
) {
  try {
    const res = await fetch(`/api/reports/${reportId}/generated/${genId}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || `report.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    console.error("Failed to download generated report");
  }
}

interface GeneratedReportsListProps {
  reportId: string;
  generatedReports: GeneratedReport[];
  loading: boolean;
}

export function GeneratedReportsList({
  reportId,
  generatedReports,
  loading,
}: GeneratedReportsListProps) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">
        Generated Reports
      </h4>
      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Loading...</span>
        </div>
      ) : generatedReports.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No generated reports yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {generatedReports.map((gen) => (
            <div
              key={gen.id}
              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase">
                  {gen.format}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                  {gen.fileName || `report.${gen.format}`}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {formatDate(gen.generatedAt)}
                </span>
                {gen.summary && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    ({gen.summary.totalTransactions} txns)
                  </span>
                )}
              </div>
              <button
                onClick={() => downloadGeneratedReport(reportId, gen.id, gen.fileName, gen.format)}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
