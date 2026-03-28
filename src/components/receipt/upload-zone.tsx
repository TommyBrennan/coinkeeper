"use client";

import type { RefObject } from "react";

interface UploadZoneProps {
  dragActive: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadZone({
  dragActive,
  fileInputRef,
  onDrag,
  onDrop,
  onFileInput,
}: UploadZoneProps) {
  return (
    <div
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload receipt image — drag and drop or click to browse"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      className={`relative flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
        dragActive
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
          : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-900/50"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFileInput}
        className="hidden"
        aria-label="Choose receipt image file"
      />
      <svg
        className={`w-12 h-12 mb-4 ${
          dragActive
            ? "text-emerald-500"
            : "text-gray-400 dark:text-gray-600"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
        />
      </svg>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {dragActive ? "Drop your receipt here" : "Upload a receipt image"}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Drag & drop or click to browse. JPEG, PNG, WebP, GIF up to 10MB.
      </p>
    </div>
  );
}
