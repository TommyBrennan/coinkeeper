"use client";

import { SectionError } from "@/components/section-error";

export default function IncomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SectionError
      title="Failed to load income"
      description="We couldn't load your income entries. This might be a temporary issue."
      error={error}
      reset={reset}
      backHref="/"
      backLabel="Dashboard"
    />
  );
}
