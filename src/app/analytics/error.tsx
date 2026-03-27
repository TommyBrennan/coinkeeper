"use client";

import { SectionError } from "@/components/section-error";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SectionError
      title="Failed to load analytics"
      description="We couldn't generate your analytics. This might be a temporary issue with data processing."
      error={error}
      reset={reset}
      backHref="/"
      backLabel="Dashboard"
    />
  );
}
