"use client";

import { useState } from "react";
import { useController, useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MAX_DURATION_MINUTES, MIN_DURATION_MINUTES, SLOT_MINUTES, WORKDAY_END } from "@/domain/constants";
import {
  findNearestFreeRange,
  isSlotInPast,
  validateBooking,
  type Booking,
  type BookingInput,
  type TimeRange,
  type Violation,
} from "@/domain/booking";
import {
  buildSlots,
  durationMinutes,
  toMinutes,
  toTimeString,
  type DateString,
  type TimeString,
} from "@/domain/time";
import { conflictsFrom } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/http";

import { ConflictAlert } from "./conflict-alert";
import type { useBookingMutations } from "../hooks/use-booking-mutations";

type FormValues = {
  title: string;
  start: TimeString;
  end: TimeString;
};

/** End times that satisfy rules 1-4 for the chosen start, so the selects cannot produce an
 * invalid duration at all. */
function endOptionsFor(start: TimeString): TimeString[] {
  const first = toMinutes(start) + MIN_DURATION_MINUTES;
  const last = Math.min(toMinutes(start) + MAX_DURATION_MINUTES, toMinutes(WORKDAY_END));
  const options: TimeString[] = [];
  for (let minute = first; minute <= last; minute += SLOT_MINUTES) options.push(toTimeString(minute));
  return options;
}

export function BookingFormDialog({
  date,
  editing,
  initialStart,
  bookings,
  now,
  mutations,
  onClose,
  onSaved,
}: {
  date: DateString;
  /** The booking being edited, or null when creating. */
  editing: Booking | null;
  initialStart: TimeString;
  /** The day as currently known — refreshed after every mutation, including a failed one. */
  bookings: Booking[];
  now: Date;
  mutations: ReturnType<typeof useBookingMutations>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [serverError, setServerError] = useState<unknown>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflictPrimed, setConflictPrimed] = useState(false);

  const defaultStart = editing?.start ?? initialStart;
  const {
    register,
    handleSubmit,
    control,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: editing?.title ?? "",
      start: defaultStart,
      end: editing?.end ?? endOptionsFor(defaultStart)[0],
    },
  });

  // Controlled through useController rather than register(), because the end select's
  // options depend on the chosen start. With an uncontrolled select, writing a new end
  // value before React has rendered the matching option silently drops it, leaving the
  // form holding one time while the user sees another.
  const { field: startField } = useController({ control, name: "start" });
  const { field: endField } = useController({ control, name: "end" });
  const start = startField.value;
  const end = endField.value;
  const submitting = mutations.create.isPending || mutations.update.isPending;

  // The booking's own start stays selectable even once it has passed, so a meeting that is
  // already under way can still be renamed or extended.
  const startOptions = buildSlots().filter(
    (slot) => !isSlotInPast(date, slot, now) || slot === editing?.start,
  );
  const endOptions = endOptionsFor(start);

  const applyViolations = (violations: Violation[]) => {
    const unattached: string[] = [];
    for (const violation of violations) {
      if (violation.field === "start" || violation.field === "end") {
        setError(violation.field, { type: violation.code, message: violation.message });
      } else {
        unattached.push(violation.message);
      }
    }
    setFormError(unattached[0] ?? null);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setFormError(null);
    clearErrors();

    const input: BookingInput = {
      date,
      start: values.start,
      end: values.end,
      title: values.title.trim() || undefined,
    };

    // The same function the server runs. Checking here only buys a faster answer; it is
    // not what makes the booking legal.
    const violations = validateBooking({
      input,
      existing: bookings,
      now,
      original: editing ?? undefined,
    });

    // Normally a known overlap is caught here and no request is sent. Once the conflict
    // demo has been primed we deliberately ignore it, because a background refetch may
    // already have revealed the injected booking — and then the client would block the
    // submit and the server's 409 path, the thing the demo exists to show, would never run.
    const blocking = conflictPrimed
      ? violations.filter((violation) => violation.code !== "OVERLAP")
      : violations;

    if (blocking.length > 0) {
      applyViolations(blocking);
      return;
    }

    try {
      if (editing) {
        await mutations.update.mutateAsync({ id: editing.id, patch: input });
        onSaved(`Booking updated to ${input.start}–${input.end}.`);
      } else {
        await mutations.create.mutateAsync(input);
        onSaved(`Booked ${input.start}–${input.end}.`);
      }
      onClose();
    } catch (error) {
      // Nothing is reset: the dialog stays open with every value the user entered. The
      // day behind it has already been refetched by the mutation's onSettled.
      setServerError(error);
      if (error instanceof ApiError && error.isConflict) {
        setError("start", { type: "CONFLICT", message: "This time is no longer free." });
      }
      setConflictPrimed(false);
    }
  };

  const conflicts = conflictsFrom(serverError);
  const isConflict = serverError instanceof ApiError && serverError.isConflict;
  const suggestion = isConflict
    ? findNearestFreeRange(date, durationMinutes(start, end), bookings, now, editing?.id)
    : null;

  const useSuggestion = (range: TimeRange) => {
    // Both go through the controlled fields, so the next render shows the new start, the
    // end options it implies, and the new end together.
    startField.onChange(range.start);
    endField.onChange(range.end);
    clearErrors();
    setServerError(null);
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
      dismissible={!submitting}
      title={editing ? "Edit booking" : "New booking"}
      description={`${date} · the room is bookable from 09:00 to 18:00 in ${SLOT_MINUTES}-minute slots.`}
    >
      {startOptions.length === 0 ? (
        <div className="flex flex-col gap-3">
          <Alert tone="warning">
            There are no slots left today. Try tomorrow.
          </Alert>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="booking-title" label="Title" hint="Optional — shown on the day view.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                placeholder="Design review"
                maxLength={80}
                {...register("title")}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="booking-start" label="Start" error={errors.start?.message}>
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  invalid={Boolean(errors.start)}
                  name={startField.name}
                  ref={startField.ref}
                  onBlur={startField.onBlur}
                  value={start}
                  onChange={(event) => {
                    const nextStart = event.target.value;
                    startField.onChange(nextStart);
                    // Keep the end time consistent with the new start rather than leaving
                    // an impossible pair on screen.
                    const options = endOptionsFor(nextStart);
                    if (!options.includes(end)) endField.onChange(options[0]);
                    clearErrors();
                    setServerError(null);
                  }}
                >
                  {startOptions.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field
              id="booking-end"
              label="End"
              error={errors.end?.message}
              hint={`${MIN_DURATION_MINUTES} min to ${MAX_DURATION_MINUTES / 60} h`}
            >
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  invalid={Boolean(errors.end)}
                  name={endField.name}
                  ref={endField.ref}
                  onBlur={endField.onBlur}
                  value={end}
                  onChange={(event) => {
                    endField.onChange(event.target.value);
                    clearErrors();
                    setServerError(null);
                  }}
                >
                  {endOptions.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          {formError ? (
            <Alert tone="error" live="assertive">
              {formError}
            </Alert>
          ) : null}

          {isConflict ? (
            <ConflictAlert
              conflicts={conflicts}
              suggestion={suggestion}
              onUseSuggestion={useSuggestion}
            />
          ) : serverError ? (
            <Alert tone="error" title="Could not save" live="assertive">
              {serverError instanceof ApiError
                ? serverError.message
                : "Something went wrong. Your details are still here — try again."}
            </Alert>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-edge pt-3">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editing ? "Save changes" : "Book room"}
            </Button>
          </div>

          {/*
            Demo tool for rule 8. It has the server take this exact slot without telling
            React Query, so the next Save meets a conflict the UI could not have predicted
            — the scenario the brief asks the UI to handle.
          */}
          <div className="rounded-lg border border-dashed border-edge-strong p-3">
            <p className="text-xs font-medium text-foreground-muted">Demo: server-side conflict</p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              loading={mutations.simulateConflict.isPending}
              onClick={async () => {
                await mutations.simulateConflict.mutateAsync({
                  date,
                  start,
                  end,
                  title: "Booked by someone else",
                });
                setConflictPrimed(true);
              }}
            >
              Let someone else take {start}&ndash;{end}
            </Button>
            {conflictPrimed ? (
              <p className="mt-2 text-xs text-warning" role="status">
                Taken on the server. The day view still shows it as free — press{" "}
                {editing ? "Save changes" : "Book room"} to see the conflict handled.
              </p>
            ) : null}
          </div>
        </form>
      )}
    </Dialog>
  );
}
