"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { isPastDate } from "@/domain/booking";
import { addDays, currentDate, isDateString, type DateString } from "@/domain/time";

function describeDay(date: DateString, now: Date): string {
  const today = currentDate(now);
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  if (date === addDays(today, -1)) return "Yesterday";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function DayHeader({
  date,
  onDateChange,
  now,
  bookingCount,
  refreshing,
}: {
  date: DateString;
  onDateChange: (date: DateString) => void;
  now: Date;
  bookingCount: number;
  refreshing: boolean;
}) {
  const today = currentDate(now);

  return (
    <div className="flex flex-col gap-3 border-b border-edge pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Meeting room
        </h1>
        <p className="mt-0.5 text-sm text-foreground-muted">
          {describeDay(date, now)}
          <span aria-hidden="true"> · </span>
          <span>
            {bookingCount} {bookingCount === 1 ? "booking" : "bookings"}
          </span>
          {isPastDate(date, now) ? (
            <>
              <span aria-hidden="true"> · </span>
              <span className="text-warning">past day, read-only</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/*
          A live region rather than a spinner alone: a background refresh is the moment the
          list can change under the user, so it is worth announcing.
        */}
        <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs text-foreground-muted">
          {refreshing ? (
            <>
              <Spinner />
              Updating
            </>
          ) : null}
        </span>

        <Button size="sm" onClick={() => onDateChange(addDays(date, -1))} aria-label="Previous day">
          <span aria-hidden="true">&larr;</span>
        </Button>
        <Button size="sm" onClick={() => onDateChange(today)} disabled={date === today}>
          Today
        </Button>
        <Button size="sm" onClick={() => onDateChange(addDays(date, 1))} aria-label="Next day">
          <span aria-hidden="true">&rarr;</span>
        </Button>

        <label className="sr-only" htmlFor="booking-date">
          Pick a date
        </label>
        <input
          id="booking-date"
          type="date"
          value={date}
          onChange={(event) => {
            // A date input can momentarily hold an incomplete value while being typed.
            if (isDateString(event.target.value)) onDateChange(event.target.value);
          }}
          className="min-h-9 rounded-lg border border-edge-strong bg-surface px-2.5 text-sm text-foreground"
        />
      </div>
    </div>
  );
}
