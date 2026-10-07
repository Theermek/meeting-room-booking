import { NextResponse, type NextRequest } from "next/server";

import { validateBooking } from "@/domain/booking";
import { bookingInputSchema } from "@/domain/schemas";
import { insertUnchecked } from "@/server/bookings-service";
import { allBookings } from "@/server/store";
import { errorResponse, readJson } from "@/server/http";

/**
 * POST /api/dev/conflict — demo affordance for rule 8.
 *
 * Writes a booking straight into the store without the client's cache hearing about it.
 * The UI still believes that slot is free, so the next real submit for it comes back as a
 * genuine, unanticipated 409. This is how "the server may return a conflict even if the UI
 * thought the slot was free" can be reproduced on demand rather than taken on trust.
 *
 * It bypasses the overlap and past-time checks only. Shape, grid and workday rules still
 * apply, so the store can never end up holding a booking the day view cannot render.
 */
const BYPASSED = new Set(["OVERLAP", "PAST_TIME", "PAST_DATE"]);

export async function POST(request: NextRequest) {
  const body = await readJson(request).catch(() => null);
  const parsed = bookingInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "BAD_REQUEST",
      "Provide date, start and end for the booking to inject.",
      400,
      { issues: parsed.error.issues },
    );
  }

  const blocking = validateBooking({
    input: parsed.data,
    existing: allBookings(),
    now: new Date(),
  }).filter((violation) => !BYPASSED.has(violation.code));

  if (blocking.length > 0) {
    return errorResponse("VALIDATION", blocking[0].message, 400, { violations: blocking });
  }

  const booking = insertUnchecked({
    ...parsed.data,
    title: parsed.data.title ?? "Booked by someone else",
  });
  return NextResponse.json({ booking }, { status: 201 });
}
