"use client";

import { SectionError } from "@/components/section-error";

export default function TransactionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SectionError
      title="Failed to load transactions"
      description="We couldn't load your transactions. Please try again."
      error={error}
      reset={reset}
      backHref="/"
      backLabel="Dashboard"
    />
  );
}
