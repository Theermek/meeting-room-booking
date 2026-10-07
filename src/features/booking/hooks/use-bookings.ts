"use client";

import { useQuery } from "@tanstack/react-query";

import type { DateString } from "@/domain/time";
import { getBookings } from "@/lib/api/bookings";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * The bookings for one day.
 *
 * `forceFailure` drives the `?fail=1` escape hatch so the error state and its retry path
 * can be demonstrated on the deployed demo.
 */
export function useBookings(date: DateString, forceFailure = false) {
  return useQuery({
    queryKey: [...queryKeys.bookings(date), { fail: forceFailure }],
    queryFn: () => getBookings(date, { fail: forceFailure }),
  });
}
