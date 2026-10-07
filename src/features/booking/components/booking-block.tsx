"use client";

import { Button } from "@/components/ui/button";
import { formatRange, type Booking } from "@/domain/booking";

const FINISHED_REASON = "This booking has already finished and can no longer be changed.";

/**
 * One booking drawn on the day grid, spanning as many rows as it lasts.
 *
 * `inPast` means the booking has finished: it is dimmed, labelled "finished", and its
 * actions are disabled. The state is never communicated by colour alone.
 */
export function BookingBlock({
  booking,
  span,
  startRow,
  inPast,
  onEdit,
  onDelete,
  deleting,
}: {
  booking: Booking;
  span: number;
  startRow: number;
  inPast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div
      style={{ gridRow: `${startRow} / span ${span}`, gridColumn: 2 }}
      className={`flex min-w-0 items-start justify-between gap-2 rounded-lg border px-3 py-2 ${
        inPast
          ? "border-edge bg-surface-muted text-foreground-muted"
          : "border-accent/40 bg-accent-soft text-foreground"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{booking.title ?? "Untitled booking"}</p>
        <p className="text-xs tabular-nums opacity-80">
          {formatRange(booking)}
          {inPast ? " · finished" : null}
        </p>
      </div>

      {/* Finished bookings are history — the actions remain visible but inert. */}
      <div className="flex shrink-0 gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={inPast}
          title={inPast ? FINISHED_REASON : undefined}
          onClick={onEdit}
          aria-label={
            inPast
              ? `Edit ${booking.title ?? "booking"} at ${formatRange(booking)} — unavailable, already finished`
              : `Edit ${booking.title ?? "booking"} at ${formatRange(booking)}`
          }
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={inPast}
          title={inPast ? FINISHED_REASON : undefined}
          onClick={onDelete}
          loading={deleting}
          aria-label={
            inPast
              ? `Delete ${booking.title ?? "booking"} at ${formatRange(booking)} — unavailable, already finished`
              : `Delete ${booking.title ?? "booking"} at ${formatRange(booking)}`
          }
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
