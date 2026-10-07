import type { Booking, Violation } from "@/domain/booking";

/**
 * Service-level failures, each mapping to exactly one HTTP status in the Route Handlers.
 * The handlers stay free of business reasoning: they translate, they do not decide.
 */

/** A business rule was broken -> 400. */
export class ValidationError extends Error {
  constructor(readonly violations: Violation[]) {
    super(violations[0]?.message ?? "The booking is not valid.");
    this.name = "ValidationError";
  }
}

/**
 * The slot is taken -> 409.
 *
 * Kept separate from `ValidationError` because the UI treats it differently: a conflict
 * means the client's picture of the day was stale, so it refetches and explains, rather
 * than simply marking a field as wrong.
 */
export class ConflictError extends Error {
  constructor(
    readonly conflicts: Booking[],
    message = "That time is already booked.",
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

/** No booking with that id -> 404. */
export class NotFoundError extends Error {
  constructor(id: string) {
    super(`No booking with id ${id}.`);
    this.name = "NotFoundError";
  }
}
