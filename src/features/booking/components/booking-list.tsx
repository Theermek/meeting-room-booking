"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatRange, hasBookingFinished, type Booking } from "@/domain/booking";
import { durationMinutes } from "@/domain/time";

import { EmptyState } from "./states/empty-state";

const FINISHED_REASON = "This booking has already finished and can no longer be changed.";

/**
 * The same bookings as a real list.
 *
 * The timeline carries the sense of time; this carries the semantics. It is a proper `ul`
 * so a screen reader gets a countable list, and it is where deletion is confirmed.
 */
export function BookingList({
  bookings,
  now,
  readOnly,
  onEdit,
  onDelete,
  deletingId,
}: {
  bookings: Booking[];
  now: Date;
  readOnly: boolean;
  onEdit: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
  deletingId: string | null;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (bookings.length === 0) {
    return (
      <EmptyState
        message={
          readOnly
            ? "Nothing was booked on this day."
            : "No bookings yet. Pick a free slot on the left to add one."
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {bookings.map((booking) => {
        const finished = hasBookingFinished(booking, now);
        const confirming = confirmingId === booking.id;
        const minutes = durationMinutes(booking.start, booking.end);

        return (
          <li
            key={booking.id}
            className="rounded-lg border border-edge bg-surface px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {booking.title ?? "Untitled booking"}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-foreground-muted">
                  {formatRange(booking)}
                  <span aria-hidden="true"> · </span>
                  {minutes} min
                  {finished ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      finished
                    </>
                  ) : null}
                </p>
              </div>

              {/*
                A finished booking is history: the actions stay visible but disabled, so it
                is clear they exist and why they cannot be used, rather than silently
                vanishing. The server refuses these writes too — this only saves a request.
              */}
              <div className="flex shrink-0 gap-1">
                {confirming ? (
                  <>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={deletingId === booking.id}
                      onClick={() => {
                        onDelete(booking);
                        setConfirmingId(null);
                      }}
                    >
                      Confirm
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={finished}
                      title={finished ? FINISHED_REASON : undefined}
                      onClick={() => onEdit(booking)}
                      aria-label={
                        finished
                          ? `Edit ${booking.title ?? "booking"} at ${formatRange(booking)} — unavailable, already finished`
                          : `Edit ${booking.title ?? "booking"} at ${formatRange(booking)}`
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={finished}
                      title={finished ? FINISHED_REASON : undefined}
                      onClick={() => setConfirmingId(booking.id)}
                      aria-label={
                        finished
                          ? `Delete ${booking.title ?? "booking"} at ${formatRange(booking)} — unavailable, already finished`
                          : `Delete ${booking.title ?? "booking"} at ${formatRange(booking)}`
                      }
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
