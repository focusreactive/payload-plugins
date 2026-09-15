# Task contract — run the hook's translation inside the transaction that triggered it (#124)

**Risk: HIGH.** Changes the signature both `TaskRunner` implementations are built from, touches eight
call sites, and moves work into a database transaction that previously ran outside one.

## The defects, measured

Three, not the one the issue describes. All three were reproduced before this contract was written.

**1 — the hook's work runs outside the transaction.** On Postgres, publishing a source-locale change
with `createSyncRunner` translates nothing and raises nothing. `AutoTranslateEnqueue.hook.ts:83` hands
the runner `req.payload`, which opens its own connection, so the read of the source document happens
outside the transaction the `afterChange` hook is executing in.

Traced with probes rather than reasoned about:

```
hook fires, 2 tasks, locale en          ✓
sync runner calls the translate handler
  source read → "Not Found"             ✗  the row is not visible outside the transaction
runner catches, stores on an in-memory task
enqueue returns, no error                ✓  the caller believes it worked
```

The issue says the handler "reads an empty source". It does not read at all — `payload.findByID`
throws `Not Found`, because for a fresh connection the row does not exist yet.

Isolating experiment: `transactionOptions: false` on the Postgres adapter, nothing else changed —
5 of 5 cases pass. With transactions on, 3 fail. SQLite and MongoDB do not wrap the operation, which
is why neither reproduces.

**2 — a failed translation is invisible unless the host subscribed.** `wireTranslateRunner.ts:71`
catches, calls `notifier.failed(task, error)` and rethrows; `SyncTaskRunner` then catches and stores
the message on a task object nobody reads. `LifecycleNotifier.safe()` returns early when no
`onFailed` callback is configured, and its own `logger.error` covers only a throwing *callback*. So
with the default configuration a translation failure produces no log line at all — which is what hid
defect 1.

**3 — a queued job survives the rollback of the write that queued it.** Measured on Postgres: begin a
transaction, create a published document, roll back — the `payload-jobs` row stays.

```
AssertionError: a job survived the rollback: expected 1 to be +0
```

`payload.jobs.queue` is called without `req`, so the row is written on another connection and does not
share the transaction's fate. The jobs runner is otherwise unaffected: queueing and translating on
Postgres works, verified.

**Corrected while measuring.** The first version of the rollback probe threw from an `afterChange`
hook appended to the collection. It passed — falsely: the plugin *pushes* its own hook at config time
(`AutoTranslateEnqueue.hook.ts:116`), so the throwing hook ran first and the translator's never ran.
Zero jobs for a trivial reason. Redone with an explicit transaction, where hook order cannot matter.

## Design decisions

**D1 — a one-field slice travels, not the request.**

The fix has to reach the *operation calls*, not the runner: Payload decides whether to join a caller's
transaction by looking for `transactionID` on the `req` passed **to each individual operation**
(`initTransaction` reads it off the options object). Threading a request as far as
`TaskRunnerFactory.create` and stopping there changes nothing — `fetchSourceDocument` and
`TranslateDocumentHandler` still call `payload.findByID` / `payload.update` with no `req`, on a fresh
connection. That was the first version of this decision and it was wrong; the critique caught it and
two source reads confirmed it.

What travels is the smallest thing that does the job:

```ts
/** Exactly what an operation needs to join the caller's transaction. */
export type TransactionScope = { transactionID?: string | number };
```

Measured before choosing it: a bare `{ transactionID }` passed as `req` joins the transaction —
the uncommitted row is visible through it, and invisible without it. `createLocalReq` fills in
`payload`, `i18n`, `headers`, `user` and `query` itself, and the operations declare
`req?: Partial<PayloadRequest>`, so nothing else is owed.

Rejected: threading the live `PayloadRequest` down the call chain. Two reasons, either sufficient.
It puts a Payload god type into leaf helpers, which the package's own `CLAUDE.md` forbids outside
`plugin.ts`, the config wiring and HTTP route boundaries — and an audit shows the package currently
*honours* that rule everywhere, so this would have been the first breach. And `createLocalReq`
**mutates the request it is handed**: the translator's own skip-context flag would stick to the
caller's request permanently, and because Payload processes a bulk update with one shared request, a
bulk publish would translate its first document and silently skip the rest. Handing each operation a
fresh one-field object avoids that by construction.

Rejected also: an optional second parameter (`create(payload, req?)`). It leaves the default path —
the one the hook takes — still wrong, and smears two behaviours across both runners.

**Placement:** `TransactionScope` is declared beside the existing narrow slices
(`modules/task-runner/types.ts`, the convention `Provenance.shapes.ts` already sets). It is carried by
`TaskHandler`, `TaskRunnerFactory.create`, `TranslateDocumentHandler.handle`, `fetchSourceDocument` and
the provenance service, and spent at each `payload.findByID` / `payload.update` / `payload.jobs.queue`
call as `req`. The logging fallback lands in `LifecycleNotifier` — one place, rather than in each
runner's catch.

**New surface:** none. `create`'s parameter changes type; nothing is added.

**Written contract owed:** yes — that the work a runner starts joins the caller's transaction. Nothing
in the signature says it, and it is the whole point of the change.

**Escalate to `/sp-architect`?** No. One module owns the seam, no new dependency, no data-model change.

## D2 — everything joins the transaction, and a failure that kills it is surfaced

Decided after the first build was rejected. Three candidates, all measured rather than argued:

- **Everything inside, failures swallowed** (the first build). Fixes #124, but a translation Payload
  rejects rolls the editor's save back and the hook reports success over it. Reproduced in
  `transaction-validation-failure.int.test.ts`. Rejected: silent data loss.
- **Reads inside, writes outside** (the user's first choice). **Impossible**, measured: the
  translation writes to the very document the caller has not committed, so from outside the
  transaction there is nothing to update — `payload.update` answers "Not Found" and #124 is not fixed
  at all. This is the measurement that settled the design; it is not a preference.
- **Everything inside, and a failure that killed the transaction is rethrown** — chosen. The edit is
  already gone by the time the translator sees the error, so rethrowing cannot save it; it makes the
  loss visible instead of silent, which is the trade the user accepted at the outset.

`killedTheCallersTransaction` narrows the rethrow to `APIError`, because only a Payload operation
reaches `killTransaction`. A provider outage throws before any operation runs and leaves the save
intact — measured in `transaction-failure-isolation.int.test.ts`, where the save commits and the
other locale still translates.

**The jobs runner takes no scope.** It never had this defect: its job runs after the commit. Giving
it one would add the `killTransaction` exposure to buy only the removal of an orphan job row, which
is wasted work rather than lost data.

**Provenance joins.** The receipt has to roll back with the translation it certifies, or staleness
detection reports a document translated at a fingerprint that never committed. `deleteByDocument`
keeps its prior, deliberate exemption — a failed sidecar delete must never roll back the document
delete that triggered it.

## Not a breaking change — corrected while building

The design this section was first written for threaded a required parameter, and that would have
stopped a third-party `TaskRunner` from compiling. What shipped is different: `enqueue`'s scope and
`TaskHandler`'s scope are both **optional**, so an implementation written against the old signature
still satisfies the type. `TaskRunnerProvider.create` is untouched. No `BREAKING CHANGE:` footer, and
nothing to add to `docs/DEPRECATIONS.md`.

What does change for a host is **behaviour**, and only on the sync runner: an auto-translation now
runs inside the transaction of the save that triggered it. Two consequences worth a README line —
the translation is no longer visible to another connection until that save commits, and a translation
that fails with a database error can, on Postgres, fail the save it was triggered by. The user
accepted the second; the escape hatch for a host it hurts is `createPayloadJobsRunner()`, whose jobs
are picked up after the commit.

## Pre-existing, deliberately not fixed here

Thirteen files thread the `Payload` god type into leaf helpers — `fetchSourceDocument`,
`TranslateDocumentHandler.handle`, `ProvenanceServiceFactory`. The same objection that rejected
threading `PayloadRequest`, one level down. Not this task's work; recorded so the next reader knows it
was seen rather than missed.

## Acceptance criteria

1. **Auto-translate works on Postgres.** The three currently-failing cases in `auto-translate.int.test.ts`
   and `auto-translate-unknown-locale.int.test.ts` pass. *Check: `DB_ADAPTER=postgres` integration run.*
   Fails now — this is the reproduction.
2. **The transaction reaches the source read.** *Check: unit test on `TranslateDocumentHandler.handle`
   asserting `payload.findByID` was called with the caller's `transactionID`.* Fails now, and fails on
   every adapter — unlike criterion 1, which only speaks on Postgres. This replaces an earlier version
   that asserted only what `create` received: that one would have gone green while the bug stayed,
   because the scope has to reach the operation, not the runner.
3. **A queued job does not survive a rollback.** *Check: new integration test, jobs runner, explicit
   transaction, Postgres-gated.* Fails now — measured at 1 surviving row. Covers both write paths of
   `enqueue`: queueing a new job and appending to a live one.
4. **A failed translation is logged when no `onFailed` is configured.** *Check: unit test on
   `LifecycleNotifier` asserting the logger is called.* Fails now.
5. **A configured `onFailed` still receives the failure, and is not double-reported.** *Check: unit test.*
6. **Both runners still satisfy the interface.** *Check: check-types in both packages.*
7. **Nothing regresses on SQLite or MongoDB.** *Check: integration suite on both, in both queue modes.*
8. **The caller's request is not mutated.** *Check: unit test — after a translation the hook's own
   request carries no translator context flag.* Guards the bulk-publish regression the rejected design
   would have introduced.
9. **Checks clean:** unit tests, check-types **and lint** at the repo baseline.

## Pre-flight — each criterion run against the untouched tree

1, 3, 4 fail now, which is what makes them able to tell done from not-done. 6, 7, 8 pass now.

**Criterion 2 was rewritten after its pre-flight failed.** It first read "a rolled-back source write
leaves no translated target" — and that passes today, for the wrong reason: nothing is translated at
all, so there is nothing to roll back. A criterion that cannot distinguish the fix from the bug is
worthless, so it now checks the mechanism (what the hook passes) rather than a consequence both
states share.

**Measured while checking it:** an explicit `beginTransaction` / `rollbackTransaction` does *not* roll
the document back on SQLite — the row survives — while it does on Postgres. Every criterion about
transaction behaviour is therefore Postgres-only, and the adapter-independent guard has to be a unit
test. Worth knowing before writing a rollback test that would have passed vacuously on the default
adapter.

## Human choices

- **Fix all three in one pass** rather than splitting them.
- **Tests first**, red against the broken code, then the fix.
- **Carry a one-field slice, not the request** — raised as an abstraction objection ("we need one
  field, why drag the whole request through every handler"), and it turned out to also prevent a
  bulk-publish data loss.
- **Accept that a failed translation can, on Postgres, fail the save.** Once the inline translation
  runs inside the caller's transaction, a *failed SQL statement* inside it poisons the transaction and
  every later statement in the save fails with it. That contradicts the hook's best-effort contract,
  and the user accepted it rather than nesting the translation in a savepoint or leaving the sync
  runner outside the transaction (which would leave this bug unfixed for it). Noted as unmeasured: the
  two failures we know of — a missing source row and an unreachable provider — are JavaScript throws
  with no failed statement, so they may not poison anything; nobody has measured which failures do.
- **Log the failure, do not fail the save.** The user rejected the alternative on the grounds that a
  translation failure can be asynchronous: with the jobs runner it happens after the save has
  committed, so "fail the save" is not a behaviour that runner can have at all.

## Risks

- With the sync runner the translation now runs inside the caller's transaction, so a provider call
  holds the transaction open for its duration. That is inherent to translating inline and is already
  true today — it is merely failing instead of waiting. Worth stating for hosts who use the sync
  runner on production traffic; the jobs runner has no such exposure.
- Threading `req` into the jobs runner means its reads also join the caller's transaction. For the
  status endpoints that is the same connection they already use; for `enqueue` it is the point.
- Defect 2's fallback logging will make previously-silent failures appear in host logs. That is the
  intent, but a host with a broken provider will suddenly see noise that was always there.

## Review log

_(appended by review runs)_

## Review log

**2026-09-14 — built and verified.** Red tests first on untouched source: 8 red over four files, every
failure an assertion reaching the unit. All nine criteria met; the six adapter/queue-mode integration
runs are green.

**Corrected while building — the first implementation was inert.** The scope was passed as a top-level
`transactionID` option on each call. Payload's local API has no such option: `createLocalReq` reads the
transaction from `options.req`. The unit tests went green against that, a false green, and only the
Postgres integration run exposed it. Every call now passes `req: { ...scope }` — a fresh copy per call,
because `createLocalReq` fills the object it is handed in place and one shared copy would carry the
first call's locale into the next.

**The rollback spec was mutation-proved.** With the hook reverted to pass an empty scope and the plugin
rebuilt, both of its cases go red: one surviving job row on the queue path, two jobs instead of one on
the append path.

**The logger fallback paid for itself immediately.** Before it, the "Not Found" that stopped every
translation on Postgres appeared nowhere. After it, one run of the failing spec printed the cause.

**Not a breaking change, contrary to the original plan.** Both new parameters are optional, so a
third-party `TaskRunner` still satisfies the interface. The behavioural change — the sync runner
translating inside the caller's transaction — is documented in the README instead.

**The accepted risk was measured after all, and is narrower than it was accepted as.**
`transaction-failure-isolation.int.test.ts` runs a provider failure inside the caller's transaction on
Postgres: the save commits, the locale that did not fail still translates, and the failure is logged.
So the exposure is confined to a failure that leaves a *rejected SQL statement* in the transaction —
not to the failures a host actually meets. The README says so rather than implying the wider risk.

**2026-09-14 — the reads-only design was measured and abandoned, and the fix was rebuilt.** The user
chose "reads inside the transaction, writes outside" over the silent-loss risk. It does not build: the
translation writes to the document the caller has not committed, so from outside the transaction
`payload.update` answers "Not Found" and the three #124 cases go red again — the same failure the task
set out to fix, moved from the read to the write. Recorded here because the option is the obvious one
to reach for and the reason it fails is not obvious until measured.

What shipped instead keeps every operation inside the transaction and surfaces a failure that has
already destroyed it. Both halves are pinned by integration tests on Postgres: a provider outage
leaves the save intact, and a value Payload rejects makes the save fail with that error instead of
vanishing.

**The bulk-publish guard now exists and discriminates.** Gate A found that nothing anywhere exercised
a bulk update, which is the regression the narrowed slice was chosen to prevent. The new case
translates two documents through one shared request; reverting to the rejected design — the live
request travelling uncopied — turns it red.

**Nine of nine criteria met**, with criterion 3 rewritten: it asserted that no job survives a
rollback, which the jobs runner no longer promises because it takes no scope. It now asserts that the
sync runner's translation and its provenance receipt are atomic with the save, and carries a positive
control so it cannot pass by translating nothing.
