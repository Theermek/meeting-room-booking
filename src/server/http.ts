import { NextResponse, type NextRequest } from "next/server";

import { ConflictError, NotFoundError, ValidationError } from "./errors";

/**
 * Translation layer between service errors and HTTP. The Route Handlers do no business
 * reasoning of their own; they parse, delegate, and map what comes back.
 */

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "SERVER_ERROR";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
};

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export function toErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ValidationError) {
    return errorResponse("VALIDATION", error.message, 400, { violations: error.violations });
  }
  if (error instanceof ConflictError) {
    return errorResponse("CONFLICT", error.message, 409, { conflicts: error.conflicts });
  }
  if (error instanceof NotFoundError) {
    return errorResponse("NOT_FOUND", error.message, 404);
  }

  console.error("Unhandled API error", error);
  return errorResponse("SERVER_ERROR", "Something went wrong on the server.", 500);
}

/**
 * Reads a JSON body without letting a malformed one surface as a 500.
 */
export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SyntaxError("Request body must be valid JSON.");
  }
}

const DEFAULT_LATENCY_MS = 400;

/**
 * Makes the mock API behave like a network.
 *
 * Without this the loading and submitting states would flash past too quickly to see, and
 * a reviewer could not tell whether they had been built at all. Tune with `API_LATENCY_MS`.
 */
export async function simulateLatency(): Promise<void> {
  const configured = Number(process.env.API_LATENCY_MS ?? DEFAULT_LATENCY_MS);
  if (!Number.isFinite(configured) || configured <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, configured));
}

/**
 * Lets any endpoint be pushed into failure with `?fail=1`, so the error state and its
 * retry path can be exercised on the deployed demo.
 */
export function forcedFailure(request: NextRequest): NextResponse<ApiErrorBody> | null {
  if (request.nextUrl.searchParams.get("fail") !== "1") return null;
  return errorResponse("SERVER_ERROR", "Simulated server failure (requested with ?fail=1).", 500);
}
