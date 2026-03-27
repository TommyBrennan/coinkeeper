"use client";

import { SectionError } from "@/components/section-error";

export default function ScheduledTransfersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SectionError
      title="Failed to load scheduled transfers"
      description="We couldn't load your scheduled transfers. This might be a temporary issue."
      error={error}
      reset={reset}
      backHref="/"
      backLabel="Dashboard"
    />
  );
}
