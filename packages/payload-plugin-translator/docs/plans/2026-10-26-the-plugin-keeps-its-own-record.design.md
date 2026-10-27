# The plugin keeps its own record of runs

Step 6 of the next major (#200, part of #192). Supersedes the framing in #200, which asked only to
make the runner's methods optional.

## Why

`TaskRunner` has five required members: `enqueue`, `cancel`, `run`, `assignmentsOf`,
`findByCollection`. It keeps growing for one reason — **the plugin has no record of its own work**.
Every fact it needs about a run lives in the runner, so every new need becomes a new method and a new
demand on every runner author. `assignmentsOf` was added days ago for exactly this: `/cancel` and
`/run/:id` receive a handle, and Payload's `access.update` rule is asked about a *document*, never a
handle.

Three host-facing warts in the README share that root:

| README | What the host is told today |
|---|---|
| `:401` | Payload deletes a job on completion (`deleteJobOnComplete` defaults to `true`), so "Completed" never appears in the panels — flip a Payload option yourself |
| `:403` | pruning what then accumulates is yours to manage |
| `:398` | `createSyncRunner` keeps status in memory — last 100 tasks, one hour, forgotten on restart |

And the reads are unbounded: `findRawJobs` is `pagination: false` with no limit or sort
(`PayloadJobsTaskRunner.ts:363-376`); the collection panel ships one row per live locale so the
client can reduce it to three counters; `enqueue` reads **every live job in the installation**
(`:99`). Filed as #123, measured across adapters in `2026-10-12-bound-the-status-reads.md`.

## Requirements

- R1 (in) The plugin answers "which runs exist for this document" from its own store, not from the
  runner.
- R2 (in) The plugin answers "which document does this handle name" from its own store, so
  `assignmentsOf` leaves the port.
- R3 (in) Run status survives Payload's default `deleteJobOnComplete: true`, with no option for the
  host to flip.
- R4 (in) One run per document at a time: a request for a document with an unsettled run is refused,
  and the refusal is told apart from a refusal by rights.
- R5 (in) The mandatory runner surface is `enqueue`; `stop` and `run` are capabilities, and a route
  whose capability is missing is not registered.
- R6 (in) A run is never recorded silently as absent: a failed record write fails the enqueue.
- R7 (in) A stored error carries no provider detail.
- R8 (in) Jobs queued before the upgrade keep running and stay cancellable, and the compatibility
  that allows it is removable from one file.
- R9 (out) Retention or pruning inside the plugin — settled by #122.
- R10 (out) Reconciling with the runner's storage, and any "abandoned" state derived from age.
- R11 (out) The field-picker tree and the admin forms — #48.

## Decision points

- D1 [load-bearing] Our record is the source of truth; the runner's storage is never read.
- D2 [load-bearing] One run per document — blocking, not merging.
- D3 [load-bearing] The table stores facts, not a status: `settledAt` plus `outcome`.
- D4 [load-bearing] The job input becomes a pointer, so no fact is stored twice.
- D5 [load-bearing] The record write joins the caller's transaction and its failure fails the
  enqueue.
- D6 [minor] The table is mandatory, unlike provenance.
- D7 [minor] `error` is sanitised at write; one column, no reason code until a consumer branches.
- D8 [minor] Backward compatibility is adoption in one file, not a fallback path.
- D9 [minor] `startedAt` is the plugin's own stamp, via `handle` on `TaskHandlerInput`.

## Requirement coverage

| | Design element |
|---|---|
| R1 | the `translator-runs` table, read by the four routes |
| R2 | the `(handle, targetLng)` unique key; `assignmentsOf` deleted |
| R3 | `outcome` and `settledAt` written from `context.report`, surviving the job row |
| R4 | blocking in the surviving run policy; two refusal meanings on `POST /enqueue` |
| R5 | the narrowed `TaskRunner`; routes registered by capability |
| R6 | the transaction rule — a `TranslatorError` with `mustPropagate = true` |
| R7 | `toClientErrorMessage` applied before the write |
| R8 | `adoptLegacyJob`, called from the boot backfill and from the provider |
| R9 | not built — #122 |
| R10 | not built — see "Deliberately not done" |
| R11 | not built — #48 |

## Decisions

- **Our record is the source of truth.** The runner's storage is never read. No `statesOf`, no
  reconciliation, no second opinion.
- **One run per document at a time.** A request for a document that already has an unsettled run is
  refused, not merged. This replaces the whole merge mechanism and removes the hazard it was built
  around.
- **The table stores facts, not a status.** Timestamps of what happened plus what the settlement was;
  the status vocabulary is derived, so changing it needs no migration.
- **The table is mandatory**, unlike provenance: cancel, run-now and both status routes rest on it.
- **Pruning stays the host's job** (#122, closed 2026-09-04 by PR #129) — with one new rule: a row
  whose `settledAt` is empty must not be pruned, because the queue now holds only a pointer.
- **The job input becomes a pointer.** No duplication of facts between the queue and our table.
- **Backward compatibility is one file**, not a fallback path threaded through the code.

### Why blocking rather than merging

Two runs over one document lose each other's work, and it cannot be fixed at the write. Verified in
Payload 3.90.1: `collections/operations/utilities/update.js:284` builds `dataToUpdate` as the whole
document with every locale, and `@payloadcms/drizzle/upsertRow/index.js:233` writes a row for every
locale present. A locale-scoped update chooses *where our fields land*, not *what gets rewritten*. So
run B, having read the document before run A committed, puts A's German back as it was.

Today that is survived by merging requests into one run and by asking the host to set
`jobs.enableConcurrencyControl`. Merging costs `planEnqueue`, `alreadyCovered`, `covers` and
`extendJob` — and still leaves residual cases the flag must cover.

Blocking removes all of it. The cost is an editor who wants a third locale mid-run must cancel or
wait. The failure mode is honest: a run stuck unsettled blocks its document until someone cancels,
and cancel is a button that already exists.

## The port, after

```ts
interface TaskRunner {
  enqueue(tasks: AuthorisedWork[], scope?: RequestScope): Promise<EnqueueAssignment[]>;
  stop?(handles: AuthorisedHandle[]): Promise<void>;
  run?(handle: AuthorisedHandle): Promise<RunResult>;
}
```

Five members become three; one is required. `run` stays as its own capability — it means *process
this queued job now*, and on serverless hosts it is the only way the queue moves (README `:393`).
A route whose member is missing is not registered and its control is not drawn. `SyncTaskRunner`
implements `enqueue` alone.

## The table

Modelled on the one precedent, `Provenance.collection.ts`: `admin.hidden: true`, all four `access`
rules `() => false`, written through the Local API, portable field types.

```ts
// translator-runs — one row per (handle, targetLng)
handle               text    index
collectionSlug       text    ┐ compound index
collectionId         text    ┘
sourceLng            text
targetLng            text
filters              text    null     // JSON: what this locale is asked to translate
publishOnTranslation checkbox
requesterId          text    null
requesterCollection  text    null
queuedAt             date
startedAt            date    null
settledAt            date    null  index
outcome              text    null     // delivered | failed | cancelled
error                text    null     // already client-safe; see below
attempts             number  null

indexes: [
  { fields: ["handle", "targetLng"], unique: true },
  { fields: ["collectionSlug", "collectionId"] },
]
```

**Grain** — one row per `EnqueueAssignment`, which is what `context.report` delivers.

**Upsert, not insert.** `report` sends one `queued` per assignment including a locale an existing run
already covers, so the same key can arrive twice. Follow `Provenance.store.upsert`.

**Status is derived:** `outcome` set → that outcome · `startedAt` set → running · else pending.
`settledAt` exists only so "in flight" is one indexed predicate, the shape the code already uses
(`completedAt: { exists: false }`).

**`startedAt` is the plugin's own stamp.** Running means the translation handler was called, and that
handler is the plugin's (`wireTranslateRunner.ts:47`). No `running` is added to `TaskEvent`; instead
`TaskHandlerInput` gains `handle`, which is already in scope at both call sites.

**`error` is sanitised at write, not at read.** Today the raw provider message — which can carry an
API key, the case `toClientErrorMessage` names — is stored in `payload-jobs.error` and cleaned only on
the way to the browser. Here `toClientErrorMessage` runs before the write, so the secret never
reaches the database. One column, text: four of the five failure markers are plugin-raised, and the
common provider failures (timeout, rate limit, 5xx) carry no code at all, so a code column would say
"unknown" for most real failures and has no consumer that branches on it.

**`filters` is parsed defensively.** The rule `runTargets` already states carries over with the data:
an entry the parser rejects is **dropped**, never read as naming no filter — no filters means the
whole document, so a corrupt value would turn a narrowed run into one that overwrites reviewed text.

**Caveat, written once in the code:** `TaskEvent` carries no timestamp, so `settledAt` is *when the
plugin was told*. `queuedAt` and `startedAt` are the plugin's own clock.

## The transaction rule

The row write **joins the caller's transaction, and its failure fails `enqueue`.** A lost record is
not a reporting gap: the next request would see no live run, queue a second one over the same
document, and the host pays twice for a translation that loses work.

The mechanism already exists. A failed row write raises a `TranslatorError` with
`mustPropagate = true`, and `swallowOrThrow:18,24` does the rest: inside a transaction it propagates,
outside it does not. `PermissionCheckFailed` is already classified this way. On the auto-translate
path this means the editor's save fails — which is correct, and factually unavoidable, since a failed
write inside a transaction has usually killed it already.

**Cost on that path, in operations.** Today the plugin's bookkeeping costs **zero** database
operations per locale under `SyncTaskRunner`: `report` only calls `LifecycleNotifier`. After, each
locale costs a `queued` write, a row read, a `startedAt` write and a `settledAt` write — four, inside
the editor's save. The read is removable (the sync runner just wrote the row in-process); the writes
are not.

## Refusal has two meanings now

`POST /enqueue` can refuse for two unrelated reasons, and they must not share a field: **no rights on
the document**, and **the document is busy**. A bulk request over many documents answers per
document — the free ones are queued, the busy ones are named.

When the editor re-queues after cancelling, the request is composed **from what is still owed**: a
locale already delivered is not asked for again. Otherwise cancelling costs money.

## What moves

| Moves | From | To |
|---|---|---|
| what survives of the run policy | `payload-jobs-runner/model/` | `src/core/domain/runs/` |
| `alreadyCovered`, `covers`, `extendJob`, `planEnqueue`'s merge branches | — | **deleted** — blocking replaces them |
| the stored run shape (`jobInput.schema`, `runTargets`, `normalizeJob`, `readCollectionRef`, the legacy readers) | `payload-jobs-runner/store/` | the table, plus `adoptLegacyJob` |
| `retryLimitOf`, `isLastAttempt`, `attemptsBefore` | — | **stay**: they read this runner's own configuration |
| `context.collections` | `TaskRunnerContext` | **gone** — its only two uses build the legacy `collection` field this step removes |

`core/` cannot import Payload (package `CLAUDE.md`), which is the point: the policy structurally
cannot reach back into job rows. **`serialisesPerDocument` is not needed** — blocking makes
concurrent runs impossible by construction rather than by the host's flag.

## Backward compatibility, in one file

Legacy job handling today lives in six files, which is why nobody can remove it. This time an
old-shaped job is **adopted** rather than read in parallel: on first encounter it writes our rows and
is thereafter indistinguishable from a new one.

```ts
// src/server/modules/runs/legacy/adoptLegacyJob.ts
// Delete this file, its two call sites and the old-shape schema to drop compatibility.
export async function adoptLegacyJob(deps, handle: JobHandle, input: unknown): Promise<boolean>;
```

Two call sites: the boot backfill, and the provider before invoking the handler when the input
carries no pointer. **The handler never learns the old shape exists.**

## Decision records

### D1. Our record is the source of truth

**Context.** Every fact the plugin needs about a run lives in the runner, so each new need becomes a
new port member. `assignmentsOf` arrived that way days ago.

- **Options considered:** keep reading the runner with optional capabilities, as #200 filed it · ask only `statesOf(handles)`, native to any queue · never read the runner at all

**Decision.** (c).

**Why the others lost.** (a) leaves the port growing with every future need, and leaves status
broken on Payload's default `deleteJobOnComplete: true`. (b) still needs an `unknown` answer for a
handle the runner never issued, and buys only repair after a lost report — a cure for a case the
queue's own retries already narrow.

**Consequences.** `report` stops being a notification and becomes load-bearing for correctness; it
must be asserted in `assertTaskRunnerContract`. A handle no runner owns is never settled.

### D2. One run per document — blocking, not merging

**Context.** Two runs over one document lose each other's work, and it cannot be fixed at the write:
`collections/operations/utilities/update.js:284` builds the whole document with every locale, and
`@payloadcms/drizzle/upsertRow/index.js:233` writes a row per locale present.

- **Options considered:** keep merging and keep asking the host for `enableConcurrencyControl` · let the plugin serialise per document, holding a backlog · refuse while the document's run is unsettled

**Decision.** (c).

**Why the others lost.** (a) costs `planEnqueue`, `alreadyCovered`, `covers` and `extendJob`, and
still leaves cases only the host's flag covers. (b) makes the plugin a scheduler and turns a stuck
row into a backlog that never drains — a silent failure with no escape hatch.

**Consequences.** An editor adding a locale mid-run must cancel or wait; the re-queue is composed
from what is still owed, or cancelling costs money. A stuck row blocks its document until someone
cancels — visible, and the button already exists. `serialisesPerDocument` is not needed.

### D3. The table stores facts, not a status

**Context.** The panel shows `pending | running | completed | failed`; those are derived, not
observed.

- **Options considered:** one `status` column · a timestamp per terminal event · `settledAt` plus `outcome`

**Decision.** (c).

**Why the others lost.** (a) freezes a vocabulary that a migration would have to change, and gives
no durations. (b) makes "in flight" three null checks rather than one indexed predicate, and lets a
row express "delivered and failed" at once.

**Consequences.** `settledAt` is the liveness predicate, matching the shape the code already uses
(`completedAt: { exists: false }`). Status is derived in one place.

### D4. The job input becomes a pointer

**Context.** What the queue stores for the Payload Jobs runner — `collection_slug`, `collection_id`,
`source_lng`, `targets` with filters, `publish_on_translation`, `requester_*`
(`PayloadJobsTaskRunner.ts:209-215`) — is the same set the table would hold.

- **Options considered:** store the facts in both the job input and the table · carry `{ handle }` in the job and read the rest from the table

**Decision.** (b).

**Why (a) lost.** It stores the same facts twice in one database and keeps the stored run shape in
the runner, where `jobInput.schema`, `runTargets`, `normalizeJob` and the legacy readers already
live — the 468 lines this step is meant to remove.

**Consequences.** A job in the Payload admin shows only a handle. A lost row makes a queued job
unrunnable, so a row with no `settledAt` must never be pruned. The handler reads the table; the
runner never does.

### D5. The record write joins the caller's transaction and its failure fails the enqueue

**Context.** Provenance writes best-effort and swallows. Here a lost record means the next request
sees no live run and queues a second one over the same document, which the host pays for twice.

- **Options considered:** best-effort and swallowed, as provenance does · fatal, through a `TranslatorError` with `mustPropagate = true`

**Decision.** (b).

**Why (a) lost.** It trades a database hiccup for a double-charged translation that also loses work.

**Consequences.** On the auto-translate path the editor's save fails — correct, and usually
unavoidable, since a failed write inside a transaction has already killed it. `PermissionCheckFailed`
is classified the same way, so this adds a member to an existing vocabulary rather than a new rule.

## Build sequence

Each step leaves the tree green and is reviewed on its own.

1. **The collection** — schema, store, wiring, slug guard, `afterDelete` cascade. Nothing reads or
   writes it yet. covers: R1
2. **Writing** — `report` gains the scope, `TaskHandlerInput` gains `handle`, the stamps, the
   sanitised error, the transaction rule. covers: R3, R6, R7
3. **Reading** — the four routes move to the table; `assignmentsOf` and `findByCollection` stop
   being called. covers: R2
4. **Blocking replaces merging** — the surviving policy moves to `core/domain/runs/`, and refusal
   gains its second meaning. covers: R4
5. **The port narrows** — routes register by capability; four deprecations removed. covers: R5
6. **The pointer input** — `adoptLegacyJob`, the boot backfill, `store/` shrinks. covers: R8

## Verification

1. every route answers with `SyncTaskRunner`, which implements `enqueue` alone;
2. a runner without `stop` does not register `/cancel`, and its control is not drawn;
3. **with Payload's default `deleteJobOnComplete: true`, a completed translation still shows
   "Completed"** — no current test covers the default; `apps/dev` and `bootTestPayload` both set it
   to `false`;
4. a second request for a busy document is refused, and the refusal is told apart from a refusal by
   rights;
5. a job queued before the upgrade runs after `adoptLegacyJob`, and runs even if the boot backfill
   never did;
6. two requests naming the same locale produce one row, not two;
7. a failed row write fails the enqueue, and on the auto-translate path fails the editor's save
   rather than leaving a run unrecorded;
8. a `filters` value the parser rejects translates nothing for that locale, rather than everything;
9. status reads issue a bounded, index-backed query — assert the `where`, not the timing;
10. an error stored for a failed run contains no provider detail.

## Deliberately not done

- **No "abandoned" state.** A row stuck in "running" after a lost final report stays there. Deriving
  abandonment from age would need a second timeout beside the runner's `staleJobTimeoutMs`, and two
  unrelated numbers would contradict each other on one row. The escape hatch is the cancel button.
- **No retention inside the plugin.** See #122.
- **`/run/:id` is not replaced by re-enqueue.** Re-enqueueing queues work; it does not run it, which
  on a cron-less host means nothing happens.
- **A handle no runner owns is never settled.** Switching runners leaves rows nothing will close.
  `statesOf` would have detected it and was dropped on purpose. One line in the README.
