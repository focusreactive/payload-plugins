# A row with no news says so

Requirements: `docs/plans/2026-11-19-fewer-worlds-louder-refusals.design.md`
Build step: 2026-11-19-fewer-worlds-louder-refusals.design.md #6

## Requirements / Task restatement

A run record can stay open for ever when the process that was running it is killed: nothing inside
that process will execute again to close it. Three changes earlier today made this survivable — the
record closes on any error the queue reports, a cancelled run closes whatever the queue remembers,
and the panel offers a cancel on a row that is in flight.

What is left is the sentence the panel shows. It says "Translating" for as long as the record stays
open, which claims work is under way. After a while that claim is no longer honest, and the editor
has no way to tell a slow translation from a dead one.

- R7 (in, part) The admin offers nothing the server cannot answer. The server cannot answer that a
  translation is still running, so the panel stops saying it.
- R8 (in, part) Nothing is a silent no-op: a record nobody will ever close stops presenting itself
  as ordinary work and says plainly that there has been no news.
- (out) Deciding that a run is dead. Nothing is written, nothing is concluded, and no runner is
  asked — those were weighed and refused, and the reasons are recorded below.
- (out) Self-healing. The editor clears a stranded record with the control already there.

## What this starts from (measured)

- `LocaleStatus.tsx:60-66` renders the `translating` row as `Translating started {timeAgo(...)}`,
  and already receives `now`. The elapsed time is on screen; only the wording is unconditional.
- The row model (`localeRow.ts`) is built without `now`, so it cannot hold this judgement.
- `staleJobTimeoutMs` (`PayloadJobsRunnerProvider.ts:31,38,68-81`, default five minutes) already
  means "longer than any honest translation of one document" — `README.md:385-389` says setting it
  too low restarts work that is still running. It is a private field of that provider.
- The client config is built at `plugin.ts:320-330` and carries `basePath`, `abilities`,
  `collections`. The runner provider is in scope at that site.
- `TaskRunnerProvider` and `RunnerCapabilities` are both exported from `src/index.ts`, so a required
  new member breaks any third-party runner.
- The synchronous runner (`SyncRunnerProvider.ts:12-21`) has no such setting and no queue: its
  translation happens inside the request.

## Decisions

### D1. The window is a constant in the panel

- **Chosen:** one module-level constant of five minutes, beside the component that reads it. No
  runner is asked, no host sets it, and nothing about it reaches the client config.
- **Why it bites:** the panel can only answer from what it holds, and what it holds is the record's
  own start time. A number that travelled from a runner would look like a promise the plugin keeps,
  and the plugin keeps none — it never ends a run on this number.
- **Accepted cost:** a host that raises its queue's `staleJobTimeoutMs` to half an hour still reads
  this sentence after five minutes. Exposing the number later adds a setting; it breaks nothing.
- **Rejected — an optional member on the published runner provider:** it was built and taken back
  out. It put a field on a published type, a field on the client config, and a fallback rule, to
  move a number the admin never honours. More machinery than it removed.
- **Rejected — a plugin-level setting of its own:** a setting nobody has asked for yet.
- **Shape check fired** on "a field added to a published type" — and that is what the chosen shape
  avoids: the published port is untouched.

### D2. The row keeps its state; only the sentence changes

- **Chosen:** the row stays `translating`. The component that already holds `now` decides which
  sentence to show.
- **Why it bites:** the judgement depends on the current time, and the row model is built without
  it. A new state would have to be recomputed on every render anyway, which is what the component
  already does.
- **Rejected — a new row state:** it would carry a meaning that is only true at the moment it was
  computed, and every reader would have to know that.
- **Consequence:** `treeModeOf` and the row's controls are untouched, which is wanted — the cancel
  stays, and nothing new is offered.

**New surface:** none — one module-level constant and one component branch.
**Written contract owed:** none; the constant carries the reason it is a constant where it is read.
**Escalate:** no.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R7 | A row in flight for less than the window still reads as translating, with its elapsed time | a component case over the status, at two minutes and at four | **passes now** — stays-true |
| AC2 | R7, R8 | A row in flight for longer than the window says there has been no news since the time it started, and does not say it is translating | same file, a new case | **fails now** — the wording is unconditional |
| AC3 | R7 | That row still offers its cancel and offers nothing else | the existing panel case for a run in flight | **passes now** — stays-true |
| AC4 | — | The published runner port is unchanged, so a third-party runner compiles untouched | the runner conformance types, and `TaskRunnerProvider` carrying no new member | **passes now** — stays-true |
| AC5 | — | The baselines hold | package suite ≥ 3032 passed / 15 skipped · integration ≥ 306 passed / 7 skipped · `check-types` 10/10 · `oxlint .` ≤ 26 warnings, 0 errors · build exits 0 | **passes now** — measured |

AC3 is the one most easily lost by accident: changing the branch that renders the sentence is one
edit away from changing what the row offers.

## Risk

**Low.** No stored shape, no server decision, no write. The worst outcome is a cautious sentence
over a translation that is genuinely still running, which costs the editor nothing — the control
beside it is the same one either way. Rollback is a revert.

Nothing published moves, so there is nothing to watch on upgrade. What is given up is stated
above: the sentence is the same five minutes for every host.

## Decisions by the owner

- 2026-11-24 — asking the runner whether work is still live is refused: it would need a new ability
  on the port, a runner in both state reads, a change to the admission rule and an obligation that
  third-party runners answer from state that survives a restart. Too much machinery for the gain.
- 2026-11-24 — nothing is written to the database on a timer, because a threshold set below a long
  honest translation would end work that is still running.
- 2026-11-24 — a stranded record is cleared by the editor. Self-healing is not built.
- 2026-11-24 — the window is hard-coded and nothing is added to the published runner port. A
  number that can be exposed later is cheaper than a published field that has to be kept.
