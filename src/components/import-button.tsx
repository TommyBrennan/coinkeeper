"use client";

import { useRef, useState } from "react";

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors: { row: number; message: string }[];
}

export function ImportButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Import failed");
      } else {
        setResult(data);
        // Reload to show new transactions
        if (data.imported > 0) {
          setTimeout(() => window.location.reload(), 2000);
        }
      }
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setLoading(false);
      // Reset file input
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <label
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors cursor-pointer ${loading ? "opacity-50 pointer-events-none" : ""}`}
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
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        {loading ? "Importing..." : "Import CSV"}
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {/* Result toast */}
      {(result || error) && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {result && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Import Complete
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {result.imported}
                </span>{" "}
                imported
                {result.skipped > 0 && (
                  <>
                    {" / "}
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {result.skipped}
                    </span>{" "}
                    skipped
                  </>
                )}
                {" / "}
                {result.total} total
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <div key={i}>
                      Row {err.row}: {err.message}
                    </div>
                  ))}
                  {result.errors.length > 10 && (
                    <div>...and {result.errors.length - 10} more errors</div>
                  )}
                </div>
              )}
              {result.imported > 0 && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Page will refresh...
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
