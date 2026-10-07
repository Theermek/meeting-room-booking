import { describe, expect, it } from "vitest";

import {
  findConflicts,
  findNearestFreeRange,
  hasBookingFinished,
  isPastDate,
  isSlotInPast,
  overlaps,
  validateBooking,
  type Booking,
  type Violation,
  type ViolationCode,
} from "./booking";

// APP_TIMEZONE is Asia/Bishkek (UTC+6, no DST): 04:00Z is 10:00 local on 2026-10-07.
const NOW = new Date("2026-10-07T04:00:00Z");
const TODAY = "2026-10-07";
const TOMORROW = "2026-10-08";
const YESTERDAY = "2026-10-06";

const codes = (violations: Violation[]): ViolationCode[] => violations.map((v) => v.code);

const booking = (
  id: string,
  start: string,
  end: string,
  date = TOMORROW,
): Booking => ({ id, date, start, end });

/** Validates against an empty day on a future date unless told otherwise. */
const check = (
  input: { date?: string; start: string; end: string; title?: string },
  options: { existing?: Booking[]; original?: Booking; now?: Date } = {},
) =>
  validateBooking({
    input: { date: input.date ?? TOMORROW, start: input.start, end: input.end, title: input.title },
    existing: options.existing ?? [],
    now: options.now ?? NOW,
    original: options.original,
  });

describe("overlaps (rule 5)", () => {
  it("does not treat touching edges as a conflict", () => {
    // The case the brief calls out explicitly.
    expect(overlaps({ start: "10:00", end: "11:00" }, { start: "11:00", end: "12:00" })).toBe(false);
    expect(overlaps({ start: "11:00", end: "12:00" }, { start: "10:00", end: "11:00" })).toBe(false);
  });

  it("detects partial overlap from either side", () => {
    expect(overlaps({ start: "10:00", end: "11:00" }, { start: "10:30", end: "11:30" })).toBe(true);
    expect(overlaps({ start: "10:30", end: "11:30" }, { start: "10:00", end: "11:00" })).toBe(true);
  });

  it("detects containment and identity", () => {
    expect(overlaps({ start: "10:00", end: "12:00" }, { start: "10:30", end: "11:00" })).toBe(true);
    expect(overlaps({ start: "10:30", end: "11:00" }, { start: "10:00", end: "12:00" })).toBe(true);
    expect(overlaps({ start: "10:00", end: "11:00" }, { start: "10:00", end: "11:00" })).toBe(true);
  });

  it("ignores ranges that do not touch at all", () => {
    expect(overlaps({ start: "09:00", end: "10:00" }, { start: "11:00", end: "12:00" })).toBe(false);
  });
});

describe("findConflicts", () => {
  const existing = [
    booking("a", "10:00", "11:00"),
    booking("b", "14:00", "15:00"),
    booking("c", "10:00", "11:00", TODAY),
  ];

  it("only considers bookings on the same date", () => {
    const found = findConflicts({ date: TOMORROW, start: "10:00", end: "11:00" }, existing);
    expect(found.map((b) => b.id)).toEqual(["a"]);
  });

  it("excludes the booking being edited (rule 7)", () => {
    const found = findConflicts({ date: TOMORROW, start: "10:00", end: "11:00" }, existing, "a");
    expect(found).toEqual([]);
  });

  it("can return several conflicts at once", () => {
    const packed = [booking("a", "10:00", "10:30"), booking("b", "10:30", "11:00")];
    const found = findConflicts({ date: TOMORROW, start: "10:00", end: "11:00" }, packed);
    expect(found.map((b) => b.id)).toEqual(["a", "b"]);
  });
});

describe("validateBooking — rule 1: inside the workday", () => {
  it("accepts a booking spanning the whole workday edges", () => {
    expect(check({ start: "09:00", end: "10:00" })).toEqual([]);
    expect(check({ start: "17:00", end: "18:00" })).toEqual([]);
  });

  it("rejects a start before opening", () => {
    expect(codes(check({ start: "08:30", end: "09:30" }))).toContain("OUTSIDE_WORKDAY");
  });

  it("rejects an end after closing", () => {
    expect(codes(check({ start: "17:30", end: "18:30" }))).toContain("OUTSIDE_WORKDAY");
  });

  it("rejects a booking that starts at closing time", () => {
    expect(codes(check({ start: "18:00", end: "18:30" }))).toContain("OUTSIDE_WORKDAY");
  });
});

describe("validateBooking — rule 2: start before end", () => {
  it("rejects a backwards range", () => {
    expect(codes(check({ start: "11:00", end: "10:00" }))).toEqual(["END_BEFORE_START"]);
  });

  it("rejects a zero-length range", () => {
    expect(codes(check({ start: "10:00", end: "10:00" }))).toEqual(["END_BEFORE_START"]);
  });

  it("does not also complain about duration on a backwards range", () => {
    expect(codes(check({ start: "11:00", end: "10:00" }))).not.toContain("TOO_SHORT");
  });
});

describe("validateBooking — rules 3 and 4: duration bounds", () => {
  it("accepts exactly the minimum", () => {
    expect(check({ start: "09:00", end: "09:30" })).toEqual([]);
  });

  it("accepts exactly the maximum", () => {
    expect(check({ start: "09:00", end: "11:00" })).toEqual([]);
  });

  it("rejects one slot over the maximum", () => {
    expect(codes(check({ start: "09:00", end: "11:30" }))).toEqual(["TOO_LONG"]);
  });

  it("rejects an under-length booking", () => {
    // Under 30 minutes is only reachable off the half-hour grid, so both rules fire.
    expect(codes(check({ start: "09:00", end: "09:15" }))).toEqual(["NOT_ON_GRID", "TOO_SHORT"]);
  });
});

describe("validateBooking — the half-hour grid", () => {
  it("rejects off-grid times", () => {
    expect(codes(check({ start: "09:15", end: "09:45" }))).toEqual(["NOT_ON_GRID", "NOT_ON_GRID"]);
  });
});

describe("validateBooking — rule 5: no overlap", () => {
  const existing = [booking("a", "10:00", "11:00")];

  it("rejects an overlapping booking and reports what it collided with", () => {
    const violations = check({ start: "10:30", end: "11:30" }, { existing });
    expect(codes(violations)).toEqual(["OVERLAP"]);
    expect(violations[0].conflicts?.map((b) => b.id)).toEqual(["a"]);
    expect(violations[0].message).toContain("10:00–11:00");
  });

  it("allows a booking that starts exactly when another ends", () => {
    expect(check({ start: "11:00", end: "12:00" }, { existing })).toEqual([]);
  });

  it("allows a booking that ends exactly when another starts", () => {
    expect(check({ start: "09:00", end: "10:00" }, { existing })).toEqual([]);
  });

  it("ignores bookings on other days", () => {
    expect(check({ date: TODAY, start: "14:00", end: "15:00" }, { existing })).toEqual([]);
  });
});

describe("validateBooking — rule 6: nothing in the past", () => {
  it("rejects any booking on a past date", () => {
    expect(codes(check({ date: YESTERDAY, start: "10:00", end: "11:00" }))).toContain("PAST_DATE");
  });

  it("rejects a slot earlier today", () => {
    expect(codes(check({ date: TODAY, start: "09:00", end: "10:00" }))).toEqual(["PAST_TIME"]);
  });

  it("accepts a slot starting exactly now", () => {
    expect(check({ date: TODAY, start: "10:00", end: "11:00" })).toEqual([]);
  });

  it("accepts a later slot today", () => {
    expect(check({ date: TODAY, start: "14:00", end: "15:00" })).toEqual([]);
  });

  it("does not apply the past-time check to a future date", () => {
    expect(check({ date: TOMORROW, start: "09:00", end: "10:00" })).toEqual([]);
  });
});

describe("validateBooking — rule 7: an edit must not conflict with itself", () => {
  const original = booking("a", "10:00", "11:00");
  const existing = [original, booking("b", "14:00", "15:00")];

  it("accepts saving a booking unchanged", () => {
    expect(check({ start: "10:00", end: "11:00" }, { existing, original })).toEqual([]);
  });

  it("accepts extending a booking into free time", () => {
    expect(check({ start: "10:00", end: "12:00" }, { existing, original })).toEqual([]);
  });

  it("still rejects moving it onto a different booking", () => {
    const violations = check({ start: "14:00", end: "15:00" }, { existing, original });
    expect(codes(violations)).toEqual(["OVERLAP"]);
    expect(violations[0].conflicts?.map((b) => b.id)).toEqual(["b"]);
  });

  it("without the original, the booking conflicts with itself", () => {
    // Guards against dropping `original` at a call site: the check must notice.
    expect(codes(check({ start: "10:00", end: "11:00" }, { existing }))).toEqual(["OVERLAP"]);
  });
});

describe("validateBooking — editing a booking that has already started", () => {
  const inProgress: Booking = { id: "a", date: TODAY, start: "09:30", end: "11:00" };

  it("allows retitling a meeting that is under way", () => {
    const violations = check(
      { date: TODAY, start: "09:30", end: "11:00", title: "Renamed" },
      { existing: [inProgress], original: inProgress },
    );
    expect(violations).toEqual([]);
  });

  it("allows extending a meeting that is under way", () => {
    const violations = check(
      { date: TODAY, start: "09:30", end: "11:30" },
      { existing: [inProgress], original: inProgress },
    );
    expect(violations).toEqual([]);
  });

  it("still refuses to move its start further into the past", () => {
    const violations = check(
      { date: TODAY, start: "09:00", end: "11:00" },
      { existing: [inProgress], original: inProgress },
    );
    expect(codes(violations)).toEqual(["PAST_TIME"]);
  });
});

describe("validateBooking — reporting", () => {
  it("returns every applicable violation rather than only the first", () => {
    // Outside the workday, backwards, and off-grid all at once.
    const violations = check({ start: "08:45", end: "08:15" });
    expect(codes(violations).length).toBeGreaterThan(1);
  });

  it("attaches a field to each violation so a form can mark the right input", () => {
    for (const violation of check({ date: YESTERDAY, start: "18:30", end: "19:30" })) {
      expect(["date", "start", "end"]).toContain(violation.field);
    }
  });
});

describe("findNearestFreeRange", () => {
  it("returns the first free hour of a future day", () => {
    expect(findNearestFreeRange(TOMORROW, 60, [], NOW)).toEqual({ start: "09:00", end: "10:00" });
  });

  it("skips over occupied time", () => {
    const existing = [booking("a", "09:00", "10:00"), booking("b", "10:00", "11:00")];
    expect(findNearestFreeRange(TOMORROW, 60, existing, NOW)).toEqual({
      start: "11:00",
      end: "12:00",
    });
  });

  it("never suggests a slot in the past when the day is today", () => {
    const suggestion = findNearestFreeRange(TODAY, 60, [], NOW);
    expect(suggestion).toEqual({ start: "10:00", end: "11:00" });
  });

  it("ignores the booking being edited", () => {
    const existing = [booking("a", "09:00", "10:00")];
    expect(findNearestFreeRange(TOMORROW, 60, existing, NOW, "a")).toEqual({
      start: "09:00",
      end: "10:00",
    });
  });

  it("returns null when the day cannot fit the duration", () => {
    const allDay = [booking("a", "09:00", "18:00")];
    expect(findNearestFreeRange(TOMORROW, 60, allDay, NOW)).toBeNull();
  });
});

describe("isPastDate / isSlotInPast", () => {
  it("agrees with validateBooking about which slots have passed", () => {
    // The day view disables slots using these helpers; the server rejects them using
    // validateBooking. If the two ever disagree, the UI lies to the user.
    for (const date of [YESTERDAY, TODAY, TOMORROW]) {
      for (const slot of ["09:00", "10:00", "14:00", "17:30"]) {
        const disabledByUi =
          isPastDate(date, NOW) || isSlotInPast(date, slot, NOW);
        const rejectedByRules = codes(
          check({ date, start: slot, end: "18:00" }, {}),
        ).some((code) => code === "PAST_DATE" || code === "PAST_TIME");
        expect(disabledByUi, `${date} ${slot}`).toBe(rejectedByRules);
      }
    }
  });

  it("treats a slot starting exactly now as still bookable", () => {
    expect(isSlotInPast(TODAY, "10:00", NOW)).toBe(false);
    expect(isSlotInPast(TODAY, "09:30", NOW)).toBe(true);
  });
});

describe("hasBookingFinished", () => {
  it("is true once the end time has passed", () => {
    expect(hasBookingFinished({ id: "a", date: TODAY, start: "09:00", end: "10:00" }, NOW)).toBe(true);
  });

  it("is false while a booking is under way", () => {
    // NOW is 10:00, so a 09:30-11:00 booking is in progress.
    expect(hasBookingFinished({ id: "a", date: TODAY, start: "09:30", end: "11:00" }, NOW)).toBe(false);
  });

  it("treats an end exactly at now as finished", () => {
    expect(hasBookingFinished({ id: "a", date: TODAY, start: "09:00", end: "10:00" }, NOW)).toBe(true);
  });

  it("looks at the date before the time", () => {
    expect(hasBookingFinished({ id: "a", date: YESTERDAY, start: "17:00", end: "18:00" }, NOW)).toBe(true);
    expect(hasBookingFinished({ id: "a", date: TOMORROW, start: "09:00", end: "10:00" }, NOW)).toBe(false);
  });
});
