/**
 * Business constants for the booking domain.
 *
 * These are the numbers the assignment's rules are written in terms of; every check in
 * `booking.ts` derives from them rather than hard-coding a literal.
 */

/** First bookable minute of the workday. */
export const WORKDAY_START = "09:00";

/** Last bookable minute of the workday — a booking may END here, not start. */
export const WORKDAY_END = "18:00";

/** The grid bookings snap to. The day view renders one row per slot. */
export const SLOT_MINUTES = 30;

/** Rule 3: a booking must last at least this long. */
export const MIN_DURATION_MINUTES = 30;

/** Rule 4: a booking may not last longer than this. */
export const MAX_DURATION_MINUTES = 120;

/**
 * One timezone for the whole app, client and server alike.
 *
 * This is not cosmetic. Vercel's servers run in UTC, so if the server asked
 * `new Date()` what time it is while the browser asked the user's own clock, the two would
 * disagree about which slots are in the past and rule 6 would behave differently depending
 * on who was asked. Pinning a single zone makes "now" mean one thing everywhere.
 */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Asia/Bishkek";
