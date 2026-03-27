"use client";

import { SectionError } from "@/components/section-error";

export default function ReceiptsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SectionError
      title="Failed to load receipts"
      description="We couldn't load your receipts. Please try again."
      error={error}
      reset={reset}
      backHref="/"
      backLabel="Dashboard"
    />
  );
}
