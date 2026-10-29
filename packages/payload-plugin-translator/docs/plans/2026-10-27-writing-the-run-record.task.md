Build step: ./2026-10-26-the-plugin-keeps-its-own-record.design.md #2

# Step 2 — writing the run record

## Requirements / Task restatement

Step 1 registered `translator-runs` and nothing touched it. This step makes the plugin write it:
every locale of every run gets a row when it is queued, a stamp when the plugin's own handler is
called for it, and a settlement when the plugin is told what became of it. The stored failure text is
sanitised before it reaches the database, not on the way out of it.

Nothing *reads* the table yet — that is step 3 — so no route, panel or policy changes behaviour. What
changes for a host is that a translation now costs three small writes per locale, and that a failed
`queued` write fails the request that asked for the translation.

Covers R3, R6 and R7 of the design.

## What already exists — platform · installed · project · verdict

- **Platform.** Payload's `update({ where })` answers `{ docs, errors }` and does not throw when the
  filter matches nothing, so a patch against a missing row is a silent no-op. That decides AC12
  below rather than inviting a guard.
- **Installed.** Nothing new is added.
- **Project.** Four pieces already exist and are used rather than re-invented:
  - `swallowOrThrow` (`server/shared/payload/swallowOrThrow.ts`) is exactly the write policy the
    design asks for — propagate inside the caller's transaction, log outside it.
  - `mustPropagate` already treats a foreign error as "assume it rolled the caller back", which is
    the behaviour the design asked a new error class to supply (see D4).
  - `toClientErrorMessage` (`server/shared/http/toClientErrorMessage.ts`) is the sanitiser R7 needs.
  - `LifecycleNotifier` is the existing best-effort half of `report`; the row write is the
    load-bearing half placed in front of it.
- **Verdict.** Nothing new is designed. One new concept is added — the ask carried by a `queued`
  event — and it is argued below.

## Decisions

**D1 — the ask rides on the `queued` event, not on `EnqueueAssignment`.**
The row stores `filters` and `publishOnTranslation`; neither is on `EnqueueAssignment`, so `report`
cannot write a complete identity today. Two shapes were weighed.

| | `EnqueueAssignment` carries the ask | the `queued` event carries it |
|---|---|---|
| next field of this kind costs | 4 edits — the type, both construction sites, and `assignmentOf` | 3 edits — the type and both construction sites |
| states admitted vs produced | `assignmentOf` builds assignments for *terminal* events, where no ask exists; it would have to invent one | every `queued` has an ask, every terminal event has none — gap 0 |
| second caller already present | the enqueue route returns assignments to the browser, which would ship filters it does not use | none, but `TaskEvent` is already a union whose variants differ by payload (`failed` carries `error`) |

Chosen: the event. It loses nothing and it follows the shape the same type already has.

**D2 — three narrow writes, replacing step 1's `upsert`.**
Chosen: `recordQueued(identity)` · `recordStarted(key, start)` · `recordSettled(key, settlement)`.
Lost: the single `upsert(record: RunRecord)` step 1 shipped. Two reasons, and the first is a defect
rather than a preference. `upsert` replaces the whole row, so the second `queued` report for a locale
an existing run already covers — which the runner contract explicitly promises to send — would wipe
that run's `startedAt` back to empty. Merging dies in step 4, but step 2 must be correct on its own.
Second, the started stamp does not know `queuedAt` and the settlement does not know the identity, so
one whole-row write forces a read before every write. Narrow methods demand only what their caller
has. Step 1's store tests are rewritten against the three.

**D3 — `recordQueued` leaves an existing row alone.**
Chosen: find by key, and return if a row is there. Lost: last-write-wins. The key already exists only
when the run already covers that locale, and in that case the row on disk is further along than the
report that arrived.

**D4 — no new error class; `mustPropagate`'s default already is the rule.**
This deviates from the design, which asks for "a `TranslatorError` with `mustPropagate = true`". A
failure out of `payload.create`/`payload.update` is a foreign error, and `mustPropagate` returns
`true` for every foreign error by design — "assume it rolled the caller's transaction back". A class
that only restates the default would be a concept with no decision in it. The context the class would
have carried (*which* write failed) is supplied by the log line instead. Recorded as a deviation; it
is one file to add if the owner wants the distinct message.

**D5 — the queued write is fatal, the stamp and the settlement are not.**
`recordQueued` is called bare, so a failure leaves `report` and fails `enqueue` — R6, and the reason
is correctness: a missing row means the next request sees no live run and queues a second one over
the same document. `recordStarted` and `recordSettled` go through `swallowOrThrow`, so inside a
transaction they propagate (it is already dead) and outside one they are logged. The alternative —
making the settlement fatal too — turns one database hiccup into a retried translation the host pays
for twice, and the design already accepts an unsettled row as the failure mode ("the escape hatch is
the cancel button").

**D6 — `translateDocument` takes `Omit<TaskHandlerInput, "handle">`.**
`TaskHandlerInput` gains `handle` because the stamp needs it. `translateDocument` never reads it, and
seven handler specs construct that input directly; `Omit` keeps them honest and states the fact —
everything the handler is given *except* the handle, which is the record's business. `openRun` in the
same module already narrows this type with `Pick`.

**New surface.** Nothing is added to `src/index.ts`. Three published-port shapes change, all inside
the `1.0.0` major: `TaskEvent`'s `queued` variant gains `ask`, `TaskHandlerInput` gains `handle`, and
`TaskRunnerContext.report` gains an optional fourth argument. The shape check fired on the last of
those (an exported function gains a parameter, and it is optional): the parameter is optional because
a runner that enqueues outside any transaction has no scope to pass, which is a real state the system
produces, not a shrug.

**Written contract.** `recordQueued` owes callers idempotency on `(handle, targetLng)` and the
promise that it does not disturb a row already there — neither is in its signature; AC2 pins both.
`report` owes the caller that the row is written before the host's callback fires, and that its own
failure is the enqueue's failure; AC9 pins the second.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R3 | Queuing a translation writes one row per locale carrying handle, collection, document, source, target, serialised filters, publish flag, requester and `queuedAt`, with every progress field empty | `bunx vitest run src/server/features/translate-document/__tests__/recordTheRun.test.ts -t "writes one row"` | exit 0, the case runs |
| AC2 | R3 | A second `queued` report for a key already recorded leaves the row as it stands | `bunx vitest run src/server/modules/runs/__tests__/store.test.ts -t "already recorded"` | exit 0, the case runs |
| AC3 | R3 | Calling the plugin's handler stamps `startedAt` and `attempts` before the translation runs | `… recordTheRun.test.ts -t "stamps"` | exit 0, the case runs |
| AC4 | R3 | A delivered locale is settled with `outcome: "delivered"`, a `settledAt`, and no error | `… recordTheRun.test.ts -t "delivered"` | exit 0, the case runs |
| AC5 | R3 | A failed locale is settled with `outcome: "failed"` and the failure text | `… recordTheRun.test.ts -t "failed"` | exit 0, the case runs |
| AC6 | R3 | A cancelled locale is settled with `outcome: "cancelled"` | `… recordTheRun.test.ts -t "cancelled"` | exit 0, the case runs |
| AC7 | R3 | A locale reported `cancelled` and then `delivered` ends as `delivered` | `… recordTheRun.test.ts -t "still settles"` | exit 0, the case runs |
| AC8 | R7 | A provider message carrying an API key is not what reaches the row | `… recordTheRun.test.ts -t "no provider detail"` | exit 0, the case runs |
| AC9 | R6 | A failing `queued` row write fails the report rather than leaving the run unrecorded | `… recordTheRun.test.ts -t "losing the run"` | exit 0, the case runs |
| AC10 | R6 | A failing settlement is logged outside a transaction and propagates inside one | `… recordTheRun.test.ts -t "transaction"` | exit 0, both cases run |
| AC11 | R6 | Every runner must let a throwing `queued` report out of `enqueue`; the published conformance suite asserts it | `bunx vitest run src/server/modules/task-runner/sync-runner/__tests__/SyncTaskRunner.contract.test.ts` | exit 0, the new case runs |
| AC12 | — | `swallowOrThrow` awaits an asynchronous `onFailure`, so the settlement written from one is not left in flight | `bunx vitest run src/server/shared/payload/__tests__/swallowOrThrow.test.ts -t "awaits"` | exit 0, the case runs |
| AC13 | R3 | On a real database, a translation through the enqueue route leaves one settled row per locale with `startedAt` set | `apps/dev`: `bunx vitest run -c vitest.integration.config.ts src/integration/translator/run-record-write.int.test.ts` | exit 0, the cases run |
| AC14 | R3 | With Payload's own default `deleteJobOnComplete: true`, the job row is gone and the run row still says `delivered` | same file, `-t "default"` | exit 0, the case runs |
| AC15 | — | No new type errors | `bun run check-types` | 0 errors |
| AC16 | — | The package suite stays green and grows | `bunx vitest run` | ≥ 2646 passing, 0 failing |
| AC17 | — | No new lint findings | `bunx oxlint .` | 43 warnings, 0 errors |
| AC18 | — | The published package still builds under the real `tsc` | repo root: `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 |
| AC19 | — | Integration suites stay green on all three adapters | `apps/dev`: `bun run test:integration` with `DB_ADAPTER` unset, `postgres`, `mongo` | ≥ 235 / 241 / 233 passing, 0 failing |

## Pre-flight

Run against the tree as step 1 left it, on 2026-10-27.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1–AC8, AC13, AC14 | — | not run: their subject does not exist. Nothing writes the table, so every row-content criterion fails by construction; AC16's count stands as the single before-number for the group | change |
| AC9, AC11 | — | not run: `report` has no row write to fail | change |
| AC10, AC12 | `bunx vitest run src/server/shared/payload/__tests__/swallowOrThrow.test.ts` | **PASS** today with 7 cases, none of which awaits `onFailure` — the gap AC12 names | change |
| AC15 | `bun run check-types` | **PASS** — 0 errors | invariant |
| AC16 | `bunx vitest run` | **PASS** — 212 files, 2646 passing | invariant |
| AC17 | `bunx oxlint .` | **PASS** — 43 warnings, 0 errors | invariant |
| AC18 | `bunx turbo run build --filter=…` | **PASS** — measured at the end of step 1 | invariant |
| AC19 | `bun run test:integration` ×3 | **PASS** — SQLite 235 / 8 skipped, PostgreSQL 241 / 2, MongoDB 233 / 10 (measured at the end of step 1) | invariant |

## Risk notes

- **The auto-translate path now writes inside the editor's save.** Four operations per locale, twenty
  on a five-locale document, and a failure fails the save. The design decided this (D5) and the
  owner confirmed it: "давай не будем тратить пользовательские деньги". What this step must not do
  is make it worse than designed — the settlement is deliberately *not* fatal (D5 above).
- **`toClientErrorMessage` returns the raw message under `NODE_ENV=development|test`.** That is its
  documented contract and it means AC8 is only true outside those environments. The spec sets the
  environment it asserts under rather than pretending the function is unconditional.
- **Sanitising at the write collides with sanitising at the read, in step 3.** Applying
  `toClientErrorMessage` twice collapses a reason's own copy to the generic text, because the
  re-authored copy no longer carries the marker `readFailureReason` looks for. Step 3 must read the
  column as already safe. Recorded here because this step is what makes it true.
- **A stamp or a settlement against a row that is not there does nothing, silently.** Payload's
  filtered update reports no error for an empty match. It happens for a job queued before the
  upgrade, which step 6 fixes by adopting it. Documented at both methods rather than guarded here.

## Review log

### Verification

| AC | Command | Result |
|---|---|---|
| AC1–AC8, AC10 | `bunx vitest run src/server/features/translate-document/__tests__/recordTheRun.test.ts` | **PASS** — 15 cases |
| AC2, AC7 | `bunx vitest run src/server/modules/runs/__tests__/store.test.ts` | **PASS** — 14 cases |
| AC9 | `… recordTheRun.test.ts -t "losing the run"` | **PASS** |
| AC11 | `bunx vitest run …/sync-runner/__tests__/SyncTaskRunner.contract.test.ts` | **PASS** — 30 cases, the new invariant among them |
| AC12 | `bunx vitest run …/shared/payload/__tests__/swallowOrThrow.test.ts` | **PASS** — 8 cases |
| AC13 | `apps/dev`: `… run-record-write.int.test.ts` | **PASS** — 4 cases |
| AC14 | `apps/dev`: `… run-record-survives-the-job.int.test.ts` | **PASS** — 1 case |
| AC15 | `bun run check-types` | **PASS** — 0 errors |
| AC16 | `bunx vitest run` | **PASS** — 214 files, 2673 passing (from 2646) |
| AC17 | `bunx oxlint .` | **PASS** — 43 warnings, 0 errors |
| AC18 | `bunx turbo run build --filter=…` | **PASS**; `bunx turbo run check-types` 9/9 |
| AC19 | `bun run test:integration` ×3 | **PASS** — SQLite 241/8 skipped, PostgreSQL 247/2, MongoDB 239/10 (from 235 / 241 / 233) |

### Mutations

Twenty-five mutations, each applied to the implementation alone, the affected specs run, and the
file restored from a scratchpad copy with the restore verified by comparison. Every one reddened
exactly the check named beside it; `M15` and `M26` reddened two, both of which they genuinely break.

| | What was broken | Went red |
|---|---|---|
| M1 | the ask stops reaching the row | writes one row carrying the ask |
| M2 | an absent requester stops reading as absent | records nobody when no requester |
| M3 | `queuedAt` stops being a moment | stamps the moment it was queued |
| M4 | the queued write becomes best-effort | fails the report rather than losing the run |
| M5 | the store stops being opened on the caller's transaction | opens the store on the caller's transaction |
| M6 | the start is stamped after the translation | stamps the start before the translation runs |
| M7 | the attempt is counted as the one already tried | counts the attempt as one past |
| M8 | a failed stamp stops the translation | translates anyway when the stamp cannot be written |
| M9 / M9b | a delivery is recorded as something else | records a delivery |
| M10 / M10b | a cancellation is recorded as something else | records a cancellation |
| M11 / M11b | the failure text reaches the row unsanitised | keeps provider detail out of the row |
| M12 / M12b | `settledAt` stops being a moment | stamps when the plugin was told |
| M13 / M13b | a failed settlement stops being survivable | logs and carries on outside a transaction |
| M14 | `onFailure` stops being awaited | awaits an `onFailure` that does work of its own |
| M15 | a patch names the run but not the locale | both key-scoped patch checks |
| M16 | a key already recorded is written over | leaves a key already recorded as it stands |
| M17 | an empty filter list stops meaning the whole document | stores nothing for an empty list |
| M18 | a job with no id is translated anyway | refuses a job the queue gave no id |
| M19 | the handle handed on is not the job's | names the run by the job's id |
| M20 | the runner swallows a failing queued report | lets a failing queued report out of enqueue |
| M21 | the write policy stops reading the caller's transaction | lets the failure out inside the transaction |
| M22 | a new row keeps progress it was not given | creates a row with no progress on it |
| M23 | a settled row refuses a later settlement | settles again over a row already settled |
| M25 | a lost race is treated as a failure | lets the winner's row stand |
| M26 / M27 | the stored filters are wrong or invented | the two remaining filter checks |

**Two checks did not bite on the first attempt, and both were real weaknesses.**

1. `swallowOrThrow` — "awaits an `onFailure`". The cleanup yielded on one resolved promise, which the
   awaits unwinding out of `swallowOrThrow` outrun, so the ordering came out right with the `await`
   removed. Rewritten against a timer, which a microtask cannot beat. M14 then reddened it.
2. The conformance invariant — "lets a failing queued report out of `enqueue`". The first version
   refused *every* report, so a runner that swallowed the queued one still rejected over the
   terminal one. Narrowed to refuse `queued` alone. M20 then reddened it.

The integration criteria (AC13, AC14) carry no mutation: the guarantees they cover are the same ones
M1–M13 prove at the unit level, and a database round trip per mutation buys nothing the unit pass
does not already say.

### The review passes

**Complexity.** Scenario taken from the design's own sequence — "a fact is added to the run record",
which happens in steps 3, 4 and 6. CHANGE is 4 (the type, the collection's field list, the migration,
and whoever supplies the value) and cannot be fewer without generating one of the first two from the
other. One finding, applied: the three settling branches of `report` repeated the same five-line
write. Collapsed into one local `settle(outcome, error)`. CHANGE unchanged at 1 branch per outcome,
READ falls from 3 statements of how a settlement is written to 1. Re-proved by M9b–M13b.

**Abstraction.** Four boundaries judged. One finding, applied: the runs barrel exported `RunIdentity`
and `RunRecordKey`, and no file outside the module names either — checked mechanically, by grep for
importers of the barrel. Removed. `RunRecordStore.find` and `findByDocument` stay unused for now;
step 3 is the documented next step that names them, which is the one case the package's barrel rule
allows.

**Comments.** Two trimmed. `TaskHandlerInput.handle` said "the translation itself never reads it",
which `TranslateDocumentInput = Omit<TaskHandlerInput, "handle">` now states structurally; the prose
went. The `noProgressYet` constant's comment restated its own name; replaced with the part that is
not obvious — the columns are written out as empty rather than left absent. Everything else kept:
each surviving comment says why, not what.

### Deviations from the contract

1. **No new error class (D4, as designed).** The design asked for a `TranslatorError` with
   `mustPropagate = true`. `mustPropagate` already answers `true` for any foreign error, so the class
   would have restated a default. Decided before implementation and recorded under Decisions.
2. **The integration spec is two files, not one.** `getPayload` caches one instance per process, so
   the boot that needs Payload's own `deleteJobOnComplete: true` cannot share a file with the others.
   AC14 points at `run-record-survives-the-job.int.test.ts`.
3. **The pre-flight said `swallowOrThrow` had 8 cases; it had 7.** The number was written without
   running the command. Corrected above.

### Findings carried forward

- **A stamp or settlement against a missing row does nothing, silently.** Payload's filtered update
  reports no error for an empty match. Reachable for a job queued before the upgrade; step 6 adopts
  those. Documented at both store methods.
- **Step 3 must read `error` as already safe.** `toClientErrorMessage` applied twice collapses a
  reason's own copy to the generic text, because the re-authored copy no longer carries the marker
  `readFailureReason` looks for.
- **The auto-translate path now costs four operations per locale inside the editor's save**, against
  zero before. Designed (D5) and confirmed by the owner, but it is the number to watch if a host
  reports slow saves on a many-locale document.
