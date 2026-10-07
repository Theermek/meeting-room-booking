"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatRange, type Booking, type TimeRange } from "@/domain/booking";

/**
 * What the user sees when the server rejects a submission that the UI believed was fine
 * (rule 8).
 *
 * It names the times that are actually taken, so the message is specific rather than a
 * generic failure, and offers the nearest free range as a single click. The form keeps
 * everything the user typed; nothing here resets it.
 */
export function ConflictAlert({
  conflicts,
  suggestion,
  onUseSuggestion,
}: {
  conflicts: Booking[];
  suggestion: TimeRange | null;
  onUseSuggestion: (range: TimeRange) => void;
}) {
  return (
    <Alert tone="error" title="Someone booked that time first" live="assertive">
      <p>
        {conflicts.length > 0
          ? `The room is now taken ${conflicts.map(formatRange).join(" and ")}. The day has been refreshed below.`
          : "That slot was taken while you were filling this in. The day has been refreshed below."}
      </p>
      <p className="mt-1">Your details are still here — pick another time and save again.</p>
      {suggestion ? (
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          onClick={() => onUseSuggestion(suggestion)}
        >
          Use {formatRange(suggestion)} instead
        </Button>
      ) : null}
    </Alert>
  );
}
