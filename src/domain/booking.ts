import {
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  SLOT_MINUTES,
  WORKDAY_END,
  WORKDAY_START,
} from "./constants";
import {
  compareDates,
  currentDate,
  currentTime,
  durationMinutes,
  isDateString,
  isOnSlotGrid,
  isTimeString,
  toMinutes,
  toTimeString,
  type DateString,
  type TimeString,
} from "./time";

export type Booking = {
  id: string;
  date: DateString;
  start: TimeString;
  end: TimeString;
  title?: string;
};

/** A booking as the client submits it, before the server assigns an id. */
export type BookingInput = Omit<Booking, "id">;

/** Anything with a start and an end — lets `overlaps` take bookings and bare ranges alike. */
export type TimeRange = { start: TimeString; end: TimeString };

export type ViolationCode =
  | "INVALID_FORMAT"
  | "NOT_ON_GRID"
  | "OUTSIDE_WORKDAY"
  | "END_BEFORE_START"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "PAST_DATE"
  | "PAST_TIME"
  | "OVERLAP"
  | "ALREADY_FINISHED";

export type Violation = {
  code: ViolationCode;
  /** Human-readable and shown to the user as-is, by both the form and the API. */
  message: string;
  /** Which form field to attach the error to, when one applies. */
  field?: "date" | "start" | "end";
  /** For OVERLAP: the bookings that stand in the way. */
  conflicts?: Booking[];
};

export function formatRange(range: TimeRange): string {
  return `${range.start}–${range.end}`;
}

/**
 * Rule 5. Deliberately strict on both sides, so touching edges do not conflict:
 * 10:00–11:00 and 11:00–12:00 are both allowed.
 */
export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/**
 * Bookings on the same date that collide with `candidate`.
 *
 * `ignoreId` implements rule 7: when editing, a booking must not be compared against itself.
 */
export function findConflicts(
  candidate: { date: DateString } & TimeRange,
  existing: Booking[],
  ignoreId?: string,
): Booking[] {
  return existing.filter(
    (booking) =>
      booking.id !== ignoreId &&
      booking.date === candidate.date &&
      overlaps(candidate, booking),
  );
}

export type ValidateBookingArgs = {
  input: BookingInput;
  /** Bookings already on the books. Only those on the same date matter. */
  existing: Booking[];
  /** Injected clock — see `time.ts`. */
  now: Date;
  /**
   * The booking being edited, when this is an edit. Supplies `ignoreId` for rule 7 and
   * exempts an already-started booking from the past-time check (see below).
   */
  original?: Booking;
};

/**
 * The single source of truth for every business rule. Both the Route Handler and the
 * booking form call this; neither re-implements a check.
 *
 * Returns every violation that applies rather than the first one, so a form can mark
 * several fields at once. An empty array means the booking is valid.
 */
export function validateBooking({
  input,
  existing,
  now,
  original,
}: ValidateBookingArgs): Violation[] {
  const violations: Violation[] = [];
  const { date, start, end } = input;

  // Shape first: every check below assumes well-formed strings. The API boundary also runs
  // zod, so reaching this is a programming error rather than bad user input.
  if (!isDateString(date)) {
    violations.push({
      code: "INVALID_FORMAT",
      field: "date",
      message: "Date must be in YYYY-MM-DD format.",
    });
  }
  if (!isTimeString(start)) {
    violations.push({
      code: "INVALID_FORMAT",
      field: "start",
      message: "Start time must be in HH:mm format.",
    });
  }
  if (!isTimeString(end)) {
    violations.push({
      code: "INVALID_FORMAT",
      field: "end",
      message: "End time must be in HH:mm format.",
    });
  }
  if (violations.length > 0) return violations;

  // The room is booked in half-hour slots, so off-grid times have nowhere to live on the
  // day view. Not spelled out in the brief; stated as an assumption in the README.
  for (const [field, value] of [
    ["start", start],
    ["end", end],
  ] as const) {
    if (!isOnSlotGrid(value)) {
      violations.push({
        code: "NOT_ON_GRID",
        field,
        message: `Times must fall on ${SLOT_MINUTES}-minute boundaries, such as 09:00 or 09:30.`,
      });
    }
  }

  // Rule 1: both ends inside the workday. A booking may end at 18:00 but not start there.
  if (
    toMinutes(start) < toMinutes(WORKDAY_START) ||
    toMinutes(start) >= toMinutes(WORKDAY_END)
  ) {
    violations.push({
      code: "OUTSIDE_WORKDAY",
      field: "start",
      message: `Start time must be between ${WORKDAY_START} and ${toTimeString(
        toMinutes(WORKDAY_END) - SLOT_MINUTES,
      )}.`,
    });
  }
  if (toMinutes(end) <= toMinutes(WORKDAY_START) || toMinutes(end) > toMinutes(WORKDAY_END)) {
    violations.push({
      code: "OUTSIDE_WORKDAY",
      field: "end",
      message: `End time must be between ${toTimeString(
        toMinutes(WORKDAY_START) + SLOT_MINUTES,
      )} and ${WORKDAY_END}.`,
    });
  }

  // Rules 2-4. Duration checks only make sense once the range points forwards.
  const duration = durationMinutes(start, end);
  if (duration <= 0) {
    violations.push({
      code: "END_BEFORE_START",
      field: "end",
      message: "End time must be after start time.",
    });
  } else {
    if (duration < MIN_DURATION_MINUTES) {
      violations.push({
        code: "TOO_SHORT",
        field: "end",
        message: `A booking must last at least ${MIN_DURATION_MINUTES} minutes.`,
      });
    }
    if (duration > MAX_DURATION_MINUTES) {
      violations.push({
        code: "TOO_LONG",
        field: "end",
        message: `A booking may not last longer than ${MAX_DURATION_MINUTES / 60} hours.`,
      });
    }
  }

  // Rule 6, in two parts.
  const today = currentDate(now);
  const dayComparison = compareDates(date, today);
  if (dayComparison < 0) {
    violations.push({
      code: "PAST_DATE",
      field: "date",
      message: "That date has already passed.",
    });
  } else if (dayComparison === 0) {
    // An edit that leaves the date and start untouched is exempt: a meeting that is already
    // under way can still be renamed or extended, it just cannot be moved into the past.
    const startUnchanged = original?.date === date && original?.start === start;
    if (!startUnchanged && toMinutes(start) < toMinutes(currentTime(now))) {
      violations.push({
        code: "PAST_TIME",
        field: "start",
        message: `That slot is in the past — it is already ${currentTime(now)}.`,
      });
    }
  }

  // Rules 5 and 7. Skipped for a backwards range, where "overlap" is meaningless.
  if (duration > 0) {
    const conflicts = findConflicts(input, existing, original?.id);
    if (conflicts.length > 0) {
      violations.push({
        code: "OVERLAP",
        field: "start",
        message: `This time overlaps an existing booking (${conflicts
          .map(formatRange)
          .join(", ")}).`,
        conflicts,
      });
    }
  }

  return violations;
}

/**
 * The earliest free range of `duration` minutes on `date` that does not collide with
 * `existing` and is not in the past.
 *
 * Used to offer a one-click alternative when the server rejects a submission with a
 * conflict. Returns null when the day has no room left.
 */
export function findNearestFreeRange(
  date: DateString,
  duration: number,
  existing: Booking[],
  now: Date,
  ignoreId?: string,
): TimeRange | null {
  const isToday = compareDates(date, currentDate(now)) === 0;
  const earliest = isToday ? toMinutes(currentTime(now)) : 0;

  for (
    let minute = toMinutes(WORKDAY_START);
    minute + duration <= toMinutes(WORKDAY_END);
    minute += SLOT_MINUTES
  ) {
    if (minute < earliest) continue;
    const candidate = { start: toTimeString(minute), end: toTimeString(minute + duration) };
    if (findConflicts({ date, ...candidate }, existing, ignoreId).length === 0) {
      return candidate;
    }
  }
  return null;
}

/** True when the whole day is already over — nothing on it can be created or changed. */
export function isPastDate(date: DateString, now: Date): boolean {
  return compareDates(date, currentDate(now)) < 0;
}

/**
 * True when a slot can no longer be booked because it has passed.
 *
 * Shares its reasoning with the PAST_DATE / PAST_TIME branch of `validateBooking`, so the
 * slots the day view disables are exactly the ones the server would reject.
 */
export function isSlotInPast(date: DateString, slot: TimeString, now: Date): boolean {
  const dayComparison = compareDates(date, currentDate(now));
  if (dayComparison !== 0) return dayComparison < 0;
  return toMinutes(slot) < toMinutes(currentTime(now));
}

/** True when a booking's end time has already passed. */
export function hasBookingFinished(booking: Booking, now: Date): boolean {
  const dayComparison = compareDates(booking.date, currentDate(now));
  if (dayComparison !== 0) return dayComparison < 0;
  return toMinutes(booking.end) <= toMinutes(currentTime(now));
}
