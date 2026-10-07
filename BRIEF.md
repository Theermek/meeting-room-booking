# Brief — how I read the assignment

My reading of the task and the decisions it forced. The README covers what was built and how
to run it; this covers why it is shaped the way it is. The assignment itself is not in this
repository, since it is the company's document to publish, not mine.

## What I think is actually being graded

The brief says the design is not judged and then lists what is. Read as a reviewer, the
signal concentrates in four places:

1. **Business logic that cannot drift.** Eight interacting rules, and the obvious failure is
   implementing them twice — once in the form, once on the server — and letting the two
   diverge over the next change.
2. **The server conflict the UI did not predict.** The only rule phrased as a warning rather
   than a constraint: "это ожидаемое поведение, а не баг". It is there to find out whether
   the UI is built around optimism or around the server being the authority.
3. **The API/UI seam.** "Легко заменяем на реальный API" is a testable claim: can you point
   at one file?
4. **Honest UI states.** Loading, empty, error, submitting. Cheap to skip, loud when missing.

Responsiveness, basic accessibility and readable TypeScript are table stakes — little credit
for having them, a lot of damage for not.

## Ambiguities, and how I resolved them

Each of these is a decision the brief left to me, not an oversight in it.

**Are bookings constrained to a grid?** The rules only set a 30-minute minimum, so 09:15–09:45
would pass. But the room is booked in slots and an off-grid booking has nowhere to sit on a
day view. I made the 30-minute grid an explicit rule with its own message, rather than letting
it be an accident of the UI.

**Whose clock decides what is "past"?** Unspecified, and it matters: the browser's clock is
untrustworthy and a deployed server runs in UTC, so the two would disagree about which slots
are still bookable. I pinned a single application timezone and had the API return `serverNow`,
which the UI anchors to. The slots the UI disables are then exactly the ones the server
rejects.

**Does "nothing in the past" forbid editing a meeting already under way?** Literally, yes —
its start time has passed. That would mean you cannot rename a meeting that is happening right
now, which is absurd. I defined "past" as *finished*, not *started*: a past date blocks
everything, while a past start time only blocks you if you are changing it.

**May a booking in the past be deleted?** The brief says nothing, which in practice means the
delete endpoint has no past check at all. I decided it may not: a finished booking is a record
of what happened, and editing or deleting it rewrites history. This is an addition to the
eight rules, enforced on the server rather than only greying out buttons.

**What does "не потерять данные, введённые пользователем" mean concretely?** I treated it as
four specific obligations on a `409`: the dialog stays open with every typed value intact, the
day refetches underneath it, the message names the time range that is actually taken rather
than failing generically, and the nearest free range of the same length is offered in one
click.

**MSW or Route Handlers?** The brief allows either. The contract it gives is HTTP, and the
scenario it cares about most needs a server that can genuinely return `409` with the
conflicting rows — so Route Handlers over an in-memory store, not request interception.

**Display format is explicitly my choice.** A day timeline plus a list, not one or the other:
the timeline makes "passed", "occupied" and "free" legible at a glance, and the list is a real
`<ul>` that carries the semantics a timeline grid cannot.

## Scope

**In:** the eight rules plus the immutability rule; create, edit, delete; a day view with date
navigation; all four UI states; server-error handling including conflicts; unit tests for the
domain layer; a mock API that validates independently of the client.

**Out, deliberately:** multiple rooms, attendees, recurrence, authentication, persistence,
optimistic updates, component and end-to-end tests. The last one is the only omission I would
argue about — see the README.

## Where I expect this to draw fire

Worth naming before a reviewer does.

- **The in-memory store resets on a cold start.** Correct for a mock, surprising on a live
  demo. Mitigated with a deterministic reseed so the demo is never empty, and documented
  rather than hidden.
- **The demo endpoints are reachable in production.** `/api/dev/conflict` writes to the store
  bypassing the overlap check. That is on purpose — the conflict behaviour is the most
  important thing here and a reviewer should be able to trigger it in two clicks — but it is a
  thing I would never ship.
- **The time spent is well under the guideline.** The README says what that does and does not
  mean.
- **No component or e2e tests.** The domain layer is covered; the UI was verified by hand.

## Timebox and stopping rule

The guideline is 4–6 hours. My stopping rule: once the eight rules, the conflict path and the
four UI states are done and verified, stop and write the README — rather than spend the
remaining budget widening scope, which the brief does not ask for and which would make the
submission harder to read, not better.
