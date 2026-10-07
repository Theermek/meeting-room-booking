/**
 * The transport boundary. This module and `bookings.ts` are the only places in the app
 * that know a network exists; replacing the mock API with a real backend means editing
 * them and nothing else.
 */

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "NETWORK";

type ApiErrorBody = {
  error?: {
    code?: ApiErrorCode;
    message?: string;
    details?: Record<string, unknown>;
  };
};

/**
 * A failed request, carrying the status and a machine-readable `code`.
 *
 * The UI branches on `code`, never on the message text — so wording can change without
 * breaking behaviour.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isConflict(): boolean {
    return this.code === "CONFLICT";
  }
}

const FALLBACK_MESSAGES: Record<number, string> = {
  400: "The request was not valid.",
  404: "That booking no longer exists.",
  409: "That time is already booked.",
  500: "The server could not complete the request.",
};

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    // A genuine transport failure: offline, DNS, aborted connection.
    throw new ApiError(0, "NETWORK", "Could not reach the server. Check your connection.");
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as ApiErrorBody | T | null;

  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "SERVER_ERROR",
      error?.message ?? FALLBACK_MESSAGES[response.status] ?? "The request failed.",
      error?.details,
    );
  }

  return body as T;
}
