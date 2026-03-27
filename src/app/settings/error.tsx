"use client";

import { SectionError } from "@/components/section-error";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SectionError
      title="Failed to load settings"
      description="We couldn't load your settings. This might be a temporary issue."
      error={error}
      reset={reset}
      backHref="/"
      backLabel="Dashboard"
    />
  );
}
