import {
  hasBookingFinished,
  validateBooking,
  type Booking,
  type BookingInput,
  type Violation,
} from "@/domain/booking";
import type { BookingPatchDto } from "@/domain/schemas";
import type { DateString } from "@/domain/time";

import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { allBookings, bookingsOn, findBooking, nextId, putBooking, removeBooking } from "./store";

/**
 * The authoritative side of the business rules.
 *
 * Every mutation runs the same `validateBooking` the client form runs. The client checks
 * first only to give fast feedback; this is the check that counts, and it is what makes a
 * 409 possible even when the UI believed the slot was free.
 */

/**
 * Splits a validation result into the two outcomes the HTTP layer distinguishes.
 *
 * A genuine rule break wins over a conflict: if the request is also malformed, telling the
 * user "that slot is taken" would be misleading.
 */
function assertValid(violations: Violation[]): void {
  if (violations.length === 0) return;

  const overlap = violations.find((violation) => violation.code === "OVERLAP");
  const others = violations.filter((violation) => violation.code !== "OVERLAP");

  if (others.length > 0) throw new ValidationError(others);
  if (overlap) throw new ConflictError(overlap.conflicts ?? [], overlap.message);
}

/**
 * A booking that has already ended is history and cannot be changed or removed.
 *
 * Deliberately keyed on the END time rather than the start: a meeting that is under way has
 * not happened yet in the sense that matters, and shortening or renaming it is legitimate.
 * Because `hasBookingFinished` compares the date first, this also covers every booking on a
 * day that has passed — including deletion, which runs no other past-time check.
 */
function assertStillMutable(booking: Booking, now: Date): void {
  if (!hasBookingFinished(booking, now)) return;
  throw new ValidationError([
    {
      code: "ALREADY_FINISHED",
      message: "That booking has already finished, so it can no longer be changed or deleted.",
    },
  ]);
}

export function listBookings(date: DateString): Booking[] {
  return bookingsOn(date);
}

export function createBooking(input: BookingInput, now: Date): Booking {
  assertValid(validateBooking({ input, existing: allBookings(), now }));
  return putBooking({ id: nextId(), ...input });
}

export function updateBooking(id: string, patch: BookingPatchDto, now: Date): Booking {
  const original = findBooking(id);
  if (!original) throw new NotFoundError(id);
  assertStillMutable(original, now);

  // A PATCH may carry any subset of fields; the rules are always checked against the
  // resulting whole booking, never against the patch alone.
  const merged: BookingInput = {
    date: patch.date ?? original.date,
    start: patch.start ?? original.start,
    end: patch.end ?? original.end,
    title: "title" in patch ? patch.title : original.title,
  };

  assertValid(validateBooking({ input: merged, existing: allBookings(), now, original }));
  return putBooking({ id, ...merged });
}

export function deleteBooking(id: string, now: Date): void {
  const booking = findBooking(id);
  if (!booking) throw new NotFoundError(id);
  assertStillMutable(booking, now);
  removeBooking(id);
}

/**
 * Writes a booking straight into the store, skipping validation.
 *
 * Exists only for the dev-only "simulate a concurrent booking" endpoint, which needs to
 * change the server's state behind the UI's back in order to demonstrate rule 8. Nothing
 * on the normal request path calls it.
 */
export function insertUnchecked(input: BookingInput): Booking {
  return putBooking({ id: nextId(), ...input });
}
