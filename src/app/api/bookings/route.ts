import { NextResponse, type NextRequest } from "next/server";

import { bookingInputSchema, dateStringSchema } from "@/domain/schemas";
import { createBooking, listBookings } from "@/server/bookings-service";
import {
  errorResponse,
  forcedFailure,
  readJson,
  simulateLatency,
  toErrorResponse,
} from "@/server/http";

/**
 * GET /api/bookings?date=YYYY-MM-DD
 *
 * Also returns `serverNow`. The server's clock is the one that decides whether a slot has
 * passed, so handing it to the client lets the UI disable exactly the slots the server
 * would reject, even when the visitor's own clock is wrong.
 */
export async function GET(request: NextRequest) {
  const forced = forcedFailure(request);
  if (forced) return forced;

  const parsed = dateStringSchema.safeParse(request.nextUrl.searchParams.get("date") ?? "");
  if (!parsed.success) {
    return errorResponse("BAD_REQUEST", "A `date` query parameter in YYYY-MM-DD form is required.", 400);
  }

  await simulateLatency();

  return NextResponse.json({
    bookings: listBookings(parsed.data),
    serverNow: new Date().toISOString(),
  });
}

/** POST /api/bookings — creates a booking, or explains why it cannot. */
export async function POST(request: NextRequest) {
  const forced = forcedFailure(request);
  if (forced) return forced;

  try {
    const body = await readJson(request);
    const parsed = bookingInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("BAD_REQUEST", "The booking payload is malformed.", 400, {
        issues: parsed.error.issues,
      });
    }

    await simulateLatency();

    const booking = createBooking(parsed.data, new Date());
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("BAD_REQUEST", error.message, 400);
    }
    return toErrorResponse(error);
  }
}
