import { NextResponse, type NextRequest } from "next/server";

import { bookingPatchSchema } from "@/domain/schemas";
import { deleteBooking, updateBooking } from "@/server/bookings-service";
import {
  errorResponse,
  forcedFailure,
  readJson,
  simulateLatency,
  toErrorResponse,
} from "@/server/http";

// Typed explicitly rather than with Next 16's generated `RouteContext` helper, so that
// `tsc --noEmit` passes on a fresh clone before anything has been built.
type Context = { params: Promise<{ id: string }> };

/** PATCH /api/bookings/:id — accepts any subset of fields; rules apply to the result. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const forced = forcedFailure(request);
  if (forced) return forced;

  try {
    const { id } = await params;
    const body = await readJson(request);
    const parsed = bookingPatchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("BAD_REQUEST", "The update payload is malformed.", 400, {
        issues: parsed.error.issues,
      });
    }

    await simulateLatency();

    const booking = updateBooking(id, parsed.data, new Date());
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("BAD_REQUEST", error.message, 400);
    }
    return toErrorResponse(error);
  }
}

/** DELETE /api/bookings/:id */
export async function DELETE(request: NextRequest, { params }: Context) {
  const forced = forcedFailure(request);
  if (forced) return forced;

  try {
    const { id } = await params;
    await simulateLatency();
    deleteBooking(id, new Date());
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
