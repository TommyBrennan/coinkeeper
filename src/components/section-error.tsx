"use client";

import { useEffect } from "react";

interface SectionErrorProps {
  title: string;
  description: string;
  error: Error & { digest?: string };
  reset: () => void;
  backHref: string;
  backLabel: string;
}

export function SectionError({
  title,
  description,
  error,
  reset,
  backHref,
  backLabel,
}: SectionErrorProps) {
  useEffect(() => {
    console.error("Section error:", error);
  }, [error]);

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 mb-4">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
            {title}
          </h2>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            {description}
          </p>

          {error.digest && (
            <p className="text-xs text-red-500 dark:text-red-400 mb-4 font-mono">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Try again
            </button>
            <a
              href={backHref}
              className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              {backLabel}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
