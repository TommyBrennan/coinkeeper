"use client";

interface ParsingIndicatorProps {
  previewUrl: string | null;
}

export function ParsingIndicator({ previewUrl }: ParsingIndicatorProps) {
  return (
    <div
      className="flex flex-col items-center py-12 space-y-4"
      role="status"
      aria-label="Analyzing receipt"
    >
      {previewUrl && (
        <div className="w-48 h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5 text-emerald-500 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Analyzing receipt with AI...
        </span>
      </div>
    </div>
  );
}
