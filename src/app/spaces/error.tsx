"use client";

import { SectionError } from "@/components/section-error";

export default function SpacesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SectionError
      title="Failed to load spaces"
      description="We couldn't load your shared spaces. Please try again."
      error={error}
      reset={reset}
      backHref="/"
      backLabel="Dashboard"
    />
  );
}
