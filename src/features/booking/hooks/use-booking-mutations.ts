"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { BookingInput } from "@/domain/booking";
import type { DateString } from "@/domain/time";
import {
  createBooking,
  deleteBooking,
  injectConflictingBooking,
  updateBooking,
  type BookingPatch,
} from "@/lib/api/bookings";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * Create, edit and delete for one day.
 *
 * Every mutation refetches the day in `onSettled` — on failure as much as on success.
 * That is what rule 8 asks for: when the server rejects a submission because somebody
 * else took the slot, the list underneath the form updates to show the new reality
 * instead of continuing to display the picture that led the user astray.
 */
export function useBookingMutations(date: DateString) {
  const queryClient = useQueryClient();

  const refetchDay = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.bookings(date) });
  };

  const create = useMutation({
    mutationFn: (input: BookingInput) => createBooking(input),
    onSettled: refetchDay,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BookingPatch }) => updateBooking(id, patch),
    onSettled: refetchDay,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSettled: refetchDay,
  });

  // Demo-only. Deliberately does NOT refetch: the point is to leave the client's cache
  // stale so the next submit meets a conflict it could not have predicted.
  const simulateConflict = useMutation({
    mutationFn: (input: BookingInput) => injectConflictingBooking(input),
  });

  return { create, update, remove, simulateConflict };
}
