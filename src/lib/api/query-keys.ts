import type { DateString } from "@/domain/time";

/** One place to build React Query keys, so invalidation can never miss a cache entry. */
export const queryKeys = {
  bookings: (date: DateString) => ["bookings", date] as const,
};
