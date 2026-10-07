import type { Booking, BookingInput } from "@/domain/booking";
import type { DateString } from "@/domain/time";

import { ApiError, fetchJson } from "./http";

/**
 * Typed calls for the booking endpoints. Relative URLs are fine because every call is made
 * from the browser; nothing here runs during server rendering.
 */

const BASE = "/api/bookings";

export type BookingsPayload = {
  bookings: Booking[];
  /**
   * The server's clock at the moment of the response. The UI uses it instead of the
   * visitor's clock so that the slots it disables are exactly the ones the server rejects.
   */
  serverNow: string;
};

export type BookingPatch = Partial<BookingInput>;

export function getBookings(date: DateString, options?: { fail?: boolean }): Promise<BookingsPayload> {
  const query = new URLSearchParams({ date });
  if (options?.fail) query.set("fail", "1");
  return fetchJson<BookingsPayload>(`${BASE}?${query}`);
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  const { booking } = await fetchJson<{ booking: Booking }>(BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return booking;
}

export async function updateBooking(id: string, patch: BookingPatch): Promise<Booking> {
  const { booking } = await fetchJson<{ booking: Booking }>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return booking;
}

export function deleteBooking(id: string): Promise<void> {
  return fetchJson<void>(`${BASE}/${id}`, { method: "DELETE" });
}

/**
 * Demo-only: has the server take a slot without telling the client's cache, so the next
 * submit for it hits a real 409. See `src/app/api/dev/conflict/route.ts`.
 */
export async function injectConflictingBooking(input: BookingInput): Promise<Booking> {
  const { booking } = await fetchJson<{ booking: Booking }>("/api/dev/conflict", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return booking;
}

/** Pulls the conflicting bookings out of a 409 so the UI can name the times involved. */
export function conflictsFrom(error: unknown): Booking[] {
  if (!(error instanceof ApiError) || !error.isConflict) return [];
  const conflicts = error.details?.conflicts;
  return Array.isArray(conflicts) ? (conflicts as Booking[]) : [];
}
