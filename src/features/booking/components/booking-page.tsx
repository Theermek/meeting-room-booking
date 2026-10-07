"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isPastDate, type Booking } from "@/domain/booking";
import type { DateString, TimeString } from "@/domain/time";
import { ApiError } from "@/lib/api/http";

import { BookingFormDialog } from "./booking-form-dialog";
import { BookingList } from "./booking-list";
import { DayHeader } from "./day-header";
import { DayTimeline } from "./day-timeline";
import { ErrorState } from "./states/error-state";
import { TimelineSkeleton } from "./states/timeline-skeleton";
import { useBookingMutations } from "../hooks/use-booking-mutations";
import { useBookings } from "../hooks/use-bookings";
import { useServerClock } from "../hooks/use-server-clock";

type DialogState = { editing: Booking | null; initialStart: TimeString };

export function BookingPage({
  initialDate,
  initialServerNow,
}: {
  initialDate: DateString;
  /** The server's clock at render time — the anchor for the first paint. */
  initialServerNow: string;
}) {
  const [date, setDate] = useState<DateString>(initialDate);
  const [forceFailure, setForceFailure] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const query = useBookings(date, forceFailure);
  const mutations = useBookingMutations(date);

  // "Now" comes from the server's clock, so the slots we disable match the ones the
  // server would reject.
  const now = useServerClock(
    query.data?.serverNow ?? initialServerNow,
    query.dataUpdatedAt,
  );

  const bookings = query.data?.bookings ?? [];
  const readOnly = isPastDate(date, now);

  const changeDate = (next: DateString) => {
    setDate(next);
    setStatus(null);
    setDeleteError(null);
    setDialog(null);
  };

  const handleDelete = async (booking: Booking) => {
    setDeleteError(null);
    setStatus(null);
    try {
      await mutations.remove.mutateAsync(booking.id);
      setStatus(`Deleted the booking at ${booking.start}–${booking.end}.`);
    } catch (error) {
      // A 404 means somebody else deleted it first; the list has already been refetched,
      // so the row simply disappears and this explains why.
      setDeleteError(error);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <DayHeader
        date={date}
        onDateChange={changeDate}
        now={now}
        bookingCount={bookings.length}
        refreshing={query.isFetching && !query.isPending}
      />

      {/* Success messages are announced politely: they confirm something the user did. */}
      <div role="status" aria-live="polite">
        {status ? (
          <Alert tone="info" className="border-success/40 text-success">
            {status}
          </Alert>
        ) : null}
      </div>

      {deleteError ? (
        <Alert tone="error" title="Could not delete" live="assertive">
          {deleteError instanceof ApiError
            ? deleteError.message
            : "The booking could not be deleted."}
        </Alert>
      ) : null}

      {readOnly ? (
        <Alert tone="warning">
          This day has already passed, so it is shown read-only. Pick today or a later date
          to make a booking.
        </Alert>
      ) : null}

      {query.isError ? (
        <ErrorState
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            // Clear the forced failure, otherwise retrying would fail forever.
            setForceFailure(false);
            void query.refetch();
          }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section aria-label="Day timeline">
            {query.isPending ? (
              <TimelineSkeleton />
            ) : (
              <DayTimeline
                date={date}
                bookings={bookings}
                now={now}
                onSelectSlot={(start) => {
                  setStatus(null);
                  setDeleteError(null);
                  setDialog({ editing: null, initialStart: start });
                }}
                onEditBooking={(booking) => {
                  setStatus(null);
                  setDeleteError(null);
                  setDialog({ editing: booking, initialStart: booking.start });
                }}
                onDeleteBooking={handleDelete}
                deletingId={mutations.remove.isPending ? mutations.remove.variables : null}
              />
            )}
          </section>

          <section aria-label="Bookings on this day" className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Bookings</h2>
            {query.isPending ? (
              <p className="text-sm text-foreground-muted">Loading…</p>
            ) : (
              <BookingList
                bookings={bookings}
                now={now}
                readOnly={readOnly}
                onEdit={(booking) => {
                  setStatus(null);
                  setDeleteError(null);
                  setDialog({ editing: booking, initialStart: booking.start });
                }}
                onDelete={handleDelete}
                deletingId={mutations.remove.isPending ? mutations.remove.variables : null}
              />
            )}
          </section>
        </div>
      )}

      <footer className="mt-2 flex flex-col gap-2 border-t border-edge pt-4 text-xs text-foreground-muted">
        <p className="font-medium">Demo tools</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setForceFailure(true);
              setStatus(null);
            }}
          >
            Make the next load fail
          </Button>
          <p>
            Sends <code>?fail=1</code> so the error state and its retry can be exercised.
            The conflict demo lives inside the booking form.
          </p>
        </div>
      </footer>

      {dialog ? (
        <BookingFormDialog
          date={date}
          editing={dialog.editing}
          initialStart={dialog.initialStart}
          bookings={bookings}
          now={now}
          mutations={mutations}
          onClose={() => setDialog(null)}
          onSaved={setStatus}
        />
      ) : null}
    </main>
  );
}
