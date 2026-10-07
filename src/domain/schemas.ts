import { z } from "zod";

import { isDateString, isTimeString } from "./time";

/**
 * Wire-format schemas, shared by the Route Handlers and the booking form.
 *
 * These validate *shape* only — "is this a well-formed HH:mm string". The business rules
 * live in `validateBooking`, so that a rule is never expressed in two places.
 */

export const dateStringSchema = z
  .string()
  .refine(isDateString, "Date must be a valid calendar date in YYYY-MM-DD format.");

export const timeStringSchema = z
  .string()
  .refine(isTimeString, "Time must be in HH:mm format.");

export const bookingTitleSchema = z
  .string()
  .trim()
  .max(80, "Title must be 80 characters or fewer.")
  .optional()
  // An empty input is "no title", not a title of "".
  .transform((value) => (value ? value : undefined));

export const bookingInputSchema = z.object({
  date: dateStringSchema,
  start: timeStringSchema,
  end: timeStringSchema,
  title: bookingTitleSchema,
});

export const bookingPatchSchema = bookingInputSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Provide at least one field to update.");

export type BookingInputDto = z.infer<typeof bookingInputSchema>;
export type BookingPatchDto = z.infer<typeof bookingPatchSchema>;
