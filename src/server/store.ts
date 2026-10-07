import { randomUUID } from "node:crypto";

import type { Booking } from "@/domain/booking";
import { addDays, currentDate } from "@/domain/time";

/**
 * In-memory stand-in for a database.
 *
 * Two deliberate consequences, both documented in the README rather than hidden:
 *  - On a serverless host each instance has its own copy, and a cold start wipes it. The
 *    seed below means the demo is never empty when that happens.
 *  - It is held on `globalThis` so Next's dev-time module reloading does not reset the
 *    room every time a file is saved.
 */
const globalForStore = globalThis as unknown as {
  __bookingStore?: Map<string, Booking>;
};

const bookings: Map<string, Booking> = globalForStore.__bookingStore ?? new Map();

if (!globalForStore.__bookingStore) {
  globalForStore.__bookingStore = bookings;
  seed();
}

/**
 * Gives the reviewer something to look at on first load: a day with a past booking, a
 * free afternoon, and a neighbouring day that is also busy.
 */
function seed(): void {
  const today = currentDate(new Date());
  const tomorrow = addDays(today, 1);

  const fixtures: Omit<Booking, "id">[] = [
    { date: today, start: "09:00", end: "10:00", title: "Daily standup" },
    { date: today, start: "14:00", end: "15:30", title: "Design review" },
    { date: tomorrow, start: "11:00", end: "12:00", title: "1:1 with the team lead" },
    { date: tomorrow, start: "16:00", end: "17:00", title: "Sprint retro" },
  ];

  for (const fixture of fixtures) {
    const id = randomUUID();
    bookings.set(id, { id, ...fixture });
  }
}

export function allBookings(): Booking[] {
  return [...bookings.values()];
}

export function bookingsOn(date: string): Booking[] {
  return allBookings()
    .filter((booking) => booking.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function findBooking(id: string): Booking | undefined {
  return bookings.get(id);
}

export function putBooking(booking: Booking): Booking {
  bookings.set(booking.id, booking);
  return booking;
}

export function removeBooking(id: string): boolean {
  return bookings.delete(id);
}

export function nextId(): string {
  return randomUUID();
}
