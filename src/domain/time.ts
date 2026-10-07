import { formatInTimeZone } from "date-fns-tz";

import { APP_TIMEZONE, SLOT_MINUTES, WORKDAY_END, WORKDAY_START } from "./constants";

/** A wall-clock time of day, `"HH:mm"` in 24-hour form. */
export type TimeString = string;

/** A calendar date, `"YYYY-MM-DD"`. */
export type DateString = string;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isTimeString(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function isDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  // Rejects calendar-shaped but non-existent dates such as 2026-02-30.
  return formatInTimeZone(new Date(`${value}T12:00:00Z`), "UTC", "yyyy-MM-dd") === value;
}

/**
 * Minutes since midnight. All time arithmetic in the domain goes through this rather than
 * through `Date`, which would drag timezones and DST into pure comparisons.
 */
export function toMinutes(time: TimeString): number {
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function toTimeString(minutesSinceMidnight: number): TimeString {
  const hours = Math.floor(minutesSinceMidnight / 60);
  const minutes = minutesSinceMidnight % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function durationMinutes(start: TimeString, end: TimeString): number {
  return toMinutes(end) - toMinutes(start);
}

/** True when a time falls on the booking grid (`:00` or `:30`). */
export function isOnSlotGrid(time: TimeString): boolean {
  return toMinutes(time) % SLOT_MINUTES === 0;
}

/**
 * Every slot a booking can START in: 09:00, 09:30 … 17:30.
 *
 * `WORKDAY_END` itself is excluded — a booking may end at 18:00 but not begin there.
 */
export function buildSlots(): TimeString[] {
  const slots: TimeString[] = [];
  for (
    let minute = toMinutes(WORKDAY_START);
    minute < toMinutes(WORKDAY_END);
    minute += SLOT_MINUTES
  ) {
    slots.push(toTimeString(minute));
  }
  return slots;
}

/** Index of a time within `buildSlots()`, or -1 when it is off-grid or outside the day. */
export function slotIndex(time: TimeString): number {
  const offset = toMinutes(time) - toMinutes(WORKDAY_START);
  if (offset < 0 || offset % SLOT_MINUTES !== 0) return -1;
  const index = offset / SLOT_MINUTES;
  return index < buildSlots().length ? index : -1;
}

/**
 * Today's date in the app timezone.
 *
 * `now` is a parameter on purpose: no function here reads the clock on its own, which is
 * what makes the "no booking in the past" rule testable without faking global time.
 */
export function currentDate(now: Date): DateString {
  return formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd");
}

/** The current wall-clock time in the app timezone. */
export function currentTime(now: Date): TimeString {
  return formatInTimeZone(now, APP_TIMEZONE, "HH:mm");
}

/**
 * Compares two `"YYYY-MM-DD"` strings. The format is lexicographically ordered, so plain
 * string comparison is correct and needs no parsing.
 */
export function compareDates(a: DateString, b: DateString): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Shifts a date string by whole days, staying in the app timezone. */
export function addDays(date: DateString, days: number): DateString {
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return formatInTimeZone(base, "UTC", "yyyy-MM-dd");
}
