"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

/**
 * A single shared clock, read through `useSyncExternalStore`.
 *
 * The device clock is an external mutable source, so reading it during render would make
 * the component impure. This keeps the reading in a cached snapshot that only changes in
 * the interval callback, which is both what React expects and what makes slots cross into
 * the past on their own.
 */
let snapshot = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function publish(): void {
  snapshot = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    publish();
    timer = setInterval(publish, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => snapshot;
/** Zero on the server, so the first client render reproduces the server's markup exactly. */
const getServerSnapshot = () => 0;

/**
 * "Now" according to the server, not the visitor's device.
 *
 * The server is what decides whether a slot has passed, so if the two clocks disagree the
 * UI would either offer slots the server then rejects or grey out slots that are still
 * bookable. It works by anchoring: take the server's timestamp and add however long has
 * elapsed on this device since that response arrived.
 *
 * @param anchorIso      The server's clock at the moment of the response.
 * @param anchorReceived When that response arrived, on this device's clock
 *                       (React Query's `dataUpdatedAt`); 0 before anything has loaded.
 */
export function useServerClock(anchorIso: string, anchorReceived: number): Date {
  const deviceNow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const anchorMs = Date.parse(anchorIso);
  if (Number.isNaN(anchorMs)) return new Date(deviceNow);

  // Until both the anchor and a local reading exist, no time is added and "now" is simply
  // the server's own timestamp.
  const elapsed = deviceNow > 0 && anchorReceived > 0 ? deviceNow - anchorReceived : 0;
  return new Date(anchorMs + elapsed);
}
