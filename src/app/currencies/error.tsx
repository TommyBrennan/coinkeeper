"use client";

import { SectionError } from "@/components/section-error";

export default function CurrenciesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SectionError
      title="Failed to load currencies"
      description="We couldn't load currency data. This might be a temporary issue."
      error={error}
      reset={reset}
      backHref="/"
      backLabel="Dashboard"
    />
  );
}
