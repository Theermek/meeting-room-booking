"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/http";

export function ErrorState({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : "The bookings for this day could not be loaded.";

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-edge bg-surface p-6">
      <Alert tone="error" title="Could not load this day" live="assertive" className="w-full">
        {message}
      </Alert>
      <Button variant="primary" onClick={onRetry} loading={retrying}>
        Try again
      </Button>
    </div>
  );
}
