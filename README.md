# Meeting room booking

Book a single meeting room across a 09:00–18:00 workday: pick a date, see what is already
booked, and create, edit or delete a booking.

The mock API is implemented with Next.js Route Handlers over an in-memory store. It validates
the business rules itself and returns `409` on a conflict, so the UI has a real server to
disagree with.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run test       # Vitest — the business rules
npm run typecheck  # tsc --noEmit
npm run lint
npm run build
```

It deploys as a standard Next.js app with no environment variables required. Set
`NEXT_PUBLIC_APP_TIMEZONE` to use a zone other than `Asia/Bishkek`.

## How it is put together

**One module owns every business rule, and both the server and the form call it.** No rule is
written twice, so the two cannot drift apart.

Dependencies run one way, and there is no import of `react`, `next` or `fetch` anywhere under
`src/domain/`:

```
features/ (UI) → lib/api/ (fetch) → ⇄ HTTP ⇄ → app/api/ (handlers) → server/ → domain/
                                                                                  ↑
                                            features/ also calls domain/ directly, for
                                            fast feedback before a request is sent
```

```
src/
  domain/        pure TypeScript: the rules, the time helpers, the zod schemas
  server/        in-memory store, the booking service, HTTP error mapping
  app/api/       Route Handlers — parse, delegate, map errors to status codes
  lib/api/       the only module that calls fetch; typed calls and ApiError
  features/      hooks and components for the day view
  components/ui/ small primitives (button, select, dialog, alert, field)
```

`src/lib/api/bookings.ts` is the single seam to the network: swapping the mock for a real
backend means editing that file and nothing else.

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · TanStack Query v5 ·
react-hook-form · zod · Radix Dialog · date-fns · Vitest.

## The business rules

They live in `validateBooking()` in `src/domain/booking.ts`, which returns every violation
that applies rather than only the first, so a form can mark several fields at once. The client
runs the same checks only to answer faster; the server is the authority and re-runs them on
every write.

| Rule | Enforced by |
|---|---|
| Inside 09:00–18:00 | `validateBooking`; the selects only offer valid times |
| `start < end` | `validateBooking`; the end select only offers times after the start |
| 30 minutes minimum | `validateBooking`; the end select starts at `start + 30` |
| 2 hours maximum | `validateBooking`; the end select stops at `start + 120` |
| No overlap, touching edges allowed | `validateBooking`; occupied slots are not clickable |
| Nothing in the past | `validateBooking` against the server clock; past slots are disabled |
| An edit must not conflict with itself | `validateBooking` takes the booking being edited |
| A finished booking cannot be changed | `assertStillMutable()` in `src/server/bookings-service.ts` |

Overlap is strict on both sides — `a.start < b.end && b.start < a.end` — so 10:00–11:00 and
11:00–12:00 are both allowed. There is a test for exactly that case.

The last rule is an addition of mine: once a booking's **end** has passed it is history and
can no longer be edited or deleted. The boundary is the end rather than the start, so a
meeting that is under way can still be renamed, extended or cancelled. It is enforced on the
server, so `curl` cannot do what the UI will not, and the buttons are disabled rather than
hidden.

### The conflict the UI did not predict

The case most worth looking at. When a write comes back `409`, the app:

1. **keeps the dialog open with every value the user typed** — nothing is reset;
2. **refetches the day**, so the timeline and list underneath the form show the new reality
   (every mutation invalidates in `onSettled`, on failure as much as on success);
3. **names the conflicting time range** from the response instead of showing a generic
   failure, in an `aria-live` region;
4. **offers the nearest free range** of the same length as a single click.

**To reproduce it:** open a free slot, press **"Let someone else take HH:MM–HH:MM"** in the
form, then **Book room**. That button writes a booking straight into the server's store
without telling the client's cache, so the next save meets a genuine, unanticipated conflict.
Once primed, the form also skips its own overlap check for that attempt, so the request really
does reach the server.

A second demo control, **"Make the next load fail"** in the footer, sends `?fail=1` — any
endpoint answers that with a `500` — to exercise the error state and its retry. The API also
has a built-in ~400 ms delay (`API_LATENCY_MS`) so the loading and submitting states are
actually visible. Both are deliberately reachable on the deployed demo.

## UI states and accessibility

Loading shows a skeleton shaped like the timeline, so nothing jumps when data lands; a
background refresh shows a small "Updating" note instead, so the view never flashes. Empty,
error (with a working retry), submitting (spinner, `aria-busy`, and the dialog cannot be
dismissed mid-flight) and per-row deleting states are all handled, and a past date renders
read-only with an explanation.

Every control is a real `<button>` — there are no clickable `div`s. Free slots carry labels
like "Book 14:00 to 14:30", passed ones "14:00 to 14:30, already passed". The dialog uses
Radix for the focus trap, Escape and the aria wiring, and focus returns to the slot that
opened it. Errors are announced through `aria-live`, form errors are tied to their inputs with
`aria-describedby`, and every state shown with colour is also written out in words. Touch
targets are at least 44px and the layout works down to 375px.

## Decisions and assumptions

- **One timezone for the whole app.** `APP_TIMEZONE`, overridable with
  `NEXT_PUBLIC_APP_TIMEZONE`. Not cosmetic: Vercel runs in UTC, so without a fixed zone the
  server and the browser would disagree about what "past" means, and the rule would behave
  differently depending on who was asked.
- **The server's clock wins.** `GET /api/bookings` also returns `serverNow`, and the UI
  anchors to it, so the slots it disables are exactly the ones the server would reject even
  if the visitor's own clock is wrong.
- **Bookings sit on a 30-minute grid.** The room is booked in slots, and an off-grid booking
  has nowhere to live on the day view. Enforced as its own rule with its own message.
- **"Past" means finished, not started** — see the rules above.
- **The store is in-memory** and resets when a serverless instance goes cold. It reseeds
  deterministically, so the demo is never empty. Held on `globalThis` so dev-time module
  reloading does not wipe it.
- **Next 16's Cache Components is off.** All data flows through client-side React Query, so
  there is nothing to prerender, and leaving it on risks baking a snapshot of the in-memory
  store into the build.

## What is not done

- **No component or end-to-end tests.** The 62 unit tests cover the domain layer, which is
  where the logic is; the UI was verified by hand in a browser (create, edit, delete, the
  conflict path, the error state, a past date, and 375px). React Testing Library around the
  form dialog and a Playwright pass over the conflict flow would be the first thing I added.
- **One room only** — no room selection, no attendees, no recurrence.
- **No optimistic updates.** With a ~400 ms API and a conflict the client cannot settle on its
  own, waiting for the server is both simpler and more honest.
- **No pagination or virtualisation** — a workday is 18 slots.
- **Dialog scrolling on very short viewports** is untested below ~600px of height.

## Time spent

About 1 hour 15 minutes end to end — roughly 3,000 lines across 39 TypeScript files.

Nothing in the scope above was cut to reach that number, and the time saved was not spent
widening scope for its own sake: the list under "What is not done" is a set of decisions, not
a list of things I ran out of time for.
