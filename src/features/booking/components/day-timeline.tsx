"use client";

import { SLOT_MINUTES } from "@/domain/constants";
import { hasBookingFinished, isSlotInPast, type Booking } from "@/domain/booking";
import {
  buildSlots,
  durationMinutes,
  slotIndex,
  toMinutes,
  toTimeString,
  type DateString,
  type TimeString,
} from "@/domain/time";

import { BookingBlock } from "./booking-block";

/**
 * The day as a grid of half-hour rows.
 *
 * Free slots are real buttons, so the whole day is reachable with Tab and Enter. Occupied
 * rows are covered by a booking block instead of a button, which keeps the tab order short
 * and means there is nothing misleading to focus.
 */
export function DayTimeline({
  date,
  bookings,
  now,
  onSelectSlot,
  onEditBooking,
  onDeleteBooking,
  deletingId,
}: {
  date: DateString;
  bookings: Booking[];
  now: Date;
  onSelectSlot: (start: TimeString) => void;
  onEditBooking: (booking: Booking) => void;
  onDeleteBooking: (booking: Booking) => void;
  deletingId: string | null;
}) {
  const slots = buildSlots();

  const blocks = bookings
    .map((booking) => ({
      booking,
      from: slotIndex(booking.start),
      span: Math.max(1, durationMinutes(booking.start, booking.end) / SLOT_MINUTES),
    }))
    // A booking that cannot be placed on the grid is still listed below the timeline, so
    // it is never silently lost.
    .filter((block) => block.from >= 0);

  const covered = new Set<number>();
  for (const block of blocks) {
    for (let offset = 0; offset < block.span; offset += 1) covered.add(block.from + offset);
  }

  return (
    <div
      className="grid grid-cols-[3.25rem_1fr] gap-x-2 gap-y-1"
      style={{ gridTemplateRows: `repeat(${slots.length}, minmax(2.75rem, auto))` }}
    >
      {slots.map((slot, index) => (
        // The time is already part of each button's accessible name, so repeating it here
        // would make the grid read twice as long for no gain.
        <span
          key={`label-${slot}`}
          aria-hidden="true"
          style={{ gridRow: index + 1, gridColumn: 1 }}
          className="pt-2.5 text-right text-xs tabular-nums text-foreground-muted"
        >
          {slot}
        </span>
      ))}

      {slots.map((slot, index) => {
        if (covered.has(index)) return null;

        const slotEnd = toTimeString(toMinutes(slot) + SLOT_MINUTES);
        const past = isSlotInPast(date, slot, now);

        return (
          <button
            key={`slot-${slot}`}
            type="button"
            disabled={past}
            onClick={() => onSelectSlot(slot)}
            style={{ gridRow: index + 1, gridColumn: 2 }}
            aria-label={
              past
                ? `${slot} to ${slotEnd}, already passed`
                : `Book ${slot} to ${slotEnd}`
            }
            className={
              past
                ? "cursor-not-allowed rounded-lg border border-dashed border-edge bg-transparent text-xs text-foreground-muted/70"
                : "rounded-lg border border-dashed border-edge-strong bg-surface text-xs text-foreground-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-foreground"
            }
          >
            {past ? "passed" : "Free"}
          </button>
        );
      })}

      {blocks.map(({ booking, from, span }) => (
        <BookingBlock
          key={booking.id}
          booking={booking}
          startRow={from + 1}
          span={span}
          inPast={hasBookingFinished(booking, now)}
          onEdit={() => onEditBooking(booking)}
          onDelete={() => onDeleteBooking(booking)}
          deleting={deletingId === booking.id}
        />
      ))}
    </div>
  );
}
