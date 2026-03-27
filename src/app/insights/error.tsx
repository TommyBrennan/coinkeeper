"use client";

import { SectionError } from "@/components/section-error";

export default function InsightsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SectionError
      title="Failed to load insights"
      description="We couldn't generate your financial insights. The AI service might be temporarily unavailable."
      error={error}
      reset={reset}
      backHref="/"
      backLabel="Dashboard"
    />
  );
}
