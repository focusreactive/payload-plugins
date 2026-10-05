# Task contract — let the error say whether the caller's work survived

**Risk: HIGH.** Changes the rule that decides whether a failure inside an editor's save is
swallowed or surfaced. The cost is asymmetric: too eager, and a save fails that did not need to;
too lax, and the editor is shown "saved" over an empty row.

## The finding

Three call sites decide the same thing — swallow this failure, or let it out:

    AutoTranslateEnqueue.hook.ts:89 · Provenance.service.ts:104 · SyncTaskRunner.ts:71
        if (killedTheCallersTransaction(scope, error)) throw error;

and they decide it by a guess:

    killedTheCallersTransaction = (scope, error) =>
      scope.transactionID != null && error instanceof APIError;

`APIError` is Payload's general error class. It says nothing about transactions. The predicate
borrows it as a *proxy* for "a Payload operation ran and has already rolled the caller's
transaction back" — true only while nobody throws an `APIError` by hand, which nothing enforces.

Why the answer matters at all: auto-translate runs in the editor's `afterChange`, inside their
transaction. Payload calls `killTransaction` from the catch of every operation, and it rolls back by
id without asking whose it is. So a failure inside one of our sixteen Payload calls destroys the
editor's save. Rethrowing cannot bring it back — it only stops us reporting a save that did not
happen. Measured: the drizzle adapter's `commitTransaction` returns silently when the session is
already gone, so swallowing really does produce a success response over a rolled-back write.

## The complication that shaped the design

"Ours" and "the caller's work survived" are not the same question, and one place proves it.
`translationPermission.ts:77` throws an error **we** construct, after `docAccessOperation` has
already killed the transaction from its own catch. A rule of the form "ours → swallow" would
swallow exactly the case that must surface.

So the error carries the answer explicitly rather than having it inferred from authorship.

## Decisions

**D1 — one root, one abstract flag, named for the requirement rather than its cause.**

    export abstract class TranslatorError extends Error {
      abstract readonly mustPropagate: boolean;
    }

`abstract readonly` rather than a defaulted field: a subclass that forgets it does not compile,
where a default would be silently inherited.

The name states what the reader must do, not why. Rejected: `callerStateLost` / `fatal` — both name
today's single cause, and a second reason not to swallow would make them lie. Rejected:
`mustRethrow` — binds the name to how one reader acts; a reader that returns instead of throwing
would make it false. Rejected: `recoverable` — in common use it means "retryable", which is a
different axis entirely (see D6). Rejected: `canBeSwallowed` — honest, but it puts a negation into
all three read sites.

Rejected: two roots (`TranslatorError` / `TranslatorFatalError`). Same information, but the
distinction lives in the class graph instead of in a field, and every future error has to pick a
parent by guessing which branch it belongs to rather than answering one question.

Rejected: chain of responsibility. Three call sites read one boolean and act identically; a chain
adds a registry and an ordering to carry what fits in a field.

**D2 — the decision reads the flag and nothing else. The transaction drops out.**

    if (mustPropagate(error)) throw error;

The old predicate asked two things — is there a transaction, and does the error look like Payload's.
Only the second was a guess; the first was a fact. A first draft of this change kept the fact and
replaced the guess, which looked conservative and was wrong: it threads `scope` into three call
sites and hoists a variable in the hook for a condition no check exercises.

Measured, not reasoned. The two specs that pin the two outcomes separate them by **who raised the
error**, never by the transaction:

    transaction-failure-isolation  swallow   failFor: ["de"]        a provider failure — ours
    transaction-validation-failure propagate a field `validate`     a Payload operation — foreign

And all three transaction specs carry `describe.skipIf(!POSTGRES)`, so the no-transaction world is
not exercised by anything.

~~What this accepts: on SQLite and MongoDB a failing Payload write now surfaces, where it used to be
swallowed.~~ **Struck 2026-10-01 — superseded by the amendment below, and wrong on its facts.**
Measured against the installed adapters rather than assumed:

| adapter | `req.transactionID` | why |
|---|---|---|
| PostgreSQL | set | drizzle `beginTransaction` |
| MongoDB | set | `beginTransaction` always opens a session and returns its id |
| SQLite | **absent** | `args.transactionOptions ? beginTransaction : defaultBeginTransaction()`, and `defaultBeginTransaction` returns `() => Promise.resolve(null)` |

So MongoDB never belonged in that sentence, and the "no transaction" world is SQLite alone (plus any
caller that opens none, such as the enqueue endpoint below).

**Amended 2026-10-01, on a Phase 5 finding.** The reasoning above covers one caller — the editor's
`afterChange` hook. `SyncTaskRunner` has a second: the `/translate/enqueue` endpoint, which runs the
same loop over an HTTP request with no transaction at all. There the old predicate's first conjunct
was permanently false, so it never rethrew; dropping it turned a per-task failure into an abandoned
batch and a 500 where the endpoint had always answered 200 and let the client poll per-task status.

So the condition returns at that one call site, and only there:

    if (scope.transactionID != null && mustPropagate(error)) throw error;

This is not the deleted guess. The guess asked a question about the *error* — "does it look like
Payload's?" — and inferred a rollback from the answer. This asks a question about the *caller*, which
the call site holds as a fact: no transaction means no caller work that a rollback could have taken.
The error still answers its own half. Both halves are pinned by a reddening check.

**One rule, not two** (owner's call, 2026-10-01). The condition reads the same everywhere it is
asked: *no transaction means the caller has no work a rollback could have taken, so swallow and log.*
That covers the enqueue endpoint and SQLite alike. The rejected alternative was to keep the struck
paragraph's judgement for SQLite — surface there, swallow on the endpoint — which buys a second rule
that every future call site would have to be told about.

Why the fact must be captured **before** the work and not read in the catch: Payload's
`killTransaction` does `delete req.transactionID` (`killTransaction.js:11`) right after rolling back.
Read afterwards, `undefined` means two opposite things — there never was a transaction, or there was
one and it just died. The scope is therefore taken at entry, which is also why the first draft had to
hoist a variable above the `try`. This is the trap that argues for lifting the rule out of the three
call sites entirely; tracked as its own task.

An error we did not make tells us nothing about whether a Payload operation ran, so it is treated
as the dangerous case. Forgetting to extend the root therefore fails towards an unnecessary
surfaced error, never towards a silent one.

**D3 — the root lives where `src/core` can reach it.**
`oxlint.config.ts` forbids `src/core` from importing `payload`, and `core` throws in six places that
reach the hook through the sync runner. The root is a plain `Error` subclass with no framework
import, so `core` can extend it.

**D4 — every throw in `src/server` and `src/core` becomes a subclass.** Thirteen sites.
Rejected: `server` only. A pipeline bug in `walkFields` or `idPath` would then be read as foreign
and kill an editor's save for a failure that touched no database at all — the rule would be leaky
on the first day.

**D5 — `killedTheCallersTransaction` is deleted, not kept as a wrapper.**
Its five checks move to whatever replaces it. A predicate kept "for compatibility" leaves the guess
reachable, and the whole point is that it is not.

**Placement:** the root and the guard test in `src/core` (framework-free, reachable from both
layers). Existing error types stay where they are and gain a parent.

**New surface:** `TranslatorError`. Callers: every throw site in `server` and `core` — thirteen.

**D6 — the flag stays a boolean, and a second question gets a second property.**
The question it answers — let this out or not — has two outcomes because there is no third action:
`wireTranslateRunner.ts:76` already notifies the host through `notifier.failed(...)` before and
independently of this decision, so the tempting `swallow / notify / throw` triple does not exist.
Rejected: an enum "with room to grow". Widening would mean guessing the shape of a second question
before it is asked, and the most likely one — "is this worth retrying?" — is an independent axis, not
another value of this one. It also cannot be used: Payload derives retries from the job's attempt
counter and accepts no per-error flag. Two read sites make widening cheap later; narrowing a wrong
enum is not.

**D7 — new knowledge arrives as a new error, not as a mutation of the old one.**
`translationPermission.ts:77` already works this way: it catches a foreign error and throws one of
ours carrying what the original could not know. Rejected: letting intermediate code set the flag on
an error in flight. An error whose meaning depends on *when* it is read can be answered differently
by two handlers at different heights; wrapping keeps each error immutable and puts the original on
`cause`. Checked across all thirteen sites: in every one the thrower already knows the answer, so
mutation would solve a problem this code does not have.

**Written contract owed:** yes. `mustPropagate` means "swallowing this would report success for work
that did not survive", not "this error is fatal". Stated on the field.

**Escalate to /sp-architect?** No. One rule, one new base class, no new seam, no data-model change.

## Acceptance criteria

1. **`killedTheCallersTransaction` is gone.** *Check: `grep -rn` over `src` — zero hits.*
   Pre-flight: 18 hits → fails now. ✓
2. **`TranslatorError` exists in `src/core`, declares `abstract readonly mustPropagate`, and imports
   nothing from `payload`.**
   *Check: the file exists; `grep` for `from "payload"` in it — zero.* Pre-flight: no such file. ✓
3. **Every literal `throw new X(...)` in `src/server`, `src/core` and `src/translation-providers`
   constructs a `TranslatorError` subclass**, proved by a guard test that scans the sources, in the
   style of `core/__tests__/no-payload-boundary.test.ts`.
   *Check: the guard test passes; and it reddens when one throw is reverted to a bare `Error`.*
   Pre-flight: 13 bare sites → fails now. ✓

   **Narrowed 2026-10-01**, from "every `throw`". The scan reads text, so `throw someVariable;` and
   `throw someCall(...)` are outside its reach — demonstrated, not assumed: replacing a literal throw
   with `const err = new Error(); throw err;` left the guard green. Four such sites exist and all four
   are deliberate (the three `mustPropagate` rethrows, which D2 requires to let foreign errors out,
   and `throw asTranslatorError(error)` in the translate handler, whose return type the compiler
   already pins to `TranslatorError`). Extending the scan to those forms was offered and declined as
   costing more upkeep than it buys; what the criterion must not do is keep claiming the wider thing.
4. **A subclass that omits the flag does not compile.**
   *Check: add one temporarily, run `bun run check-types`, see the error, remove it.*
5. **The hook still swallows a failure that left the transaction intact.**
   *Check: `transaction-failure-isolation.int.test.ts` on PostgreSQL — "does not fail the save that
   triggered it" and "still translates the locales that did not fail".* Passes now; must keep passing.
6. **The hook still surfaces a failure that destroyed the transaction.**
   *Check: `transaction-validation-failure.int.test.ts` on PostgreSQL — "fails the save visibly
   instead of discarding it in silence".* Passes now; must keep passing.
7. **`let transactionID` no longer lives outside the `try` in the hook, and no call site passes a
   scope into the decision.** Both existed only to feed the guess.
   *Check: `grep -n "let transactionID"` — zero hits; all three call sites call `mustPropagate(error)`
   with no second argument.* Pre-flight: line 37 → fails now. ✓

   **Clarified 2026-10-01** alongside the D2 amendment: `SyncTaskRunner` now reads its own
   `scope.transactionID` *beside* the call, as a fact about its caller. Nothing is passed **into**
   `mustPropagate`, which still decides on the error alone — that is the line this criterion draws.
8. **Checks clean:** unit (1605 in 133 files now, higher after), check-types across the workspace,
   lint at the 55-warning baseline, integration 155 on PostgreSQL and 149 + 6 adapter-skipped on
   SQLite and Mongo.

## Human choices

- **The flag, not two roots, and not a chain of responsibility.** The owner proposed carrying the
  answer on the error rather than inferring it; the shape was chosen against the two alternatives
  above.
- **`mustPropagate`, chosen by the owner** from seven candidates, over `mustSurface` (the same idea,
  more figurative) and five others rejected on the grounds recorded in D1.
- **Full scope including `src/core`**, chosen knowingly over a `server`-only pass, because a partial
  rule is a rule that fails on its first pipeline bug.
- **The transaction condition dropped, on the owner's challenge.** Asked three times why the
  transaction had to be known at all; the answer each time rested on an untested adapter difference.
  Measuring the specs settled it — see D2.
- **The client layer is out.** `client/`'s `TranslationApiError` and `NextApiError` run in a browser
  where no transaction exists.

## Review log

- 2026-09-30 — contract written. Phase 1 found the complication in D1 before any code existed:
  `translationPermission.ts:77` throws our own error after Payload has already rolled back, which
  a naive "ours → swallow" rule would have swallowed.

- 2026-10-01 — Phase 3 stopped and returned to Phase 2 twice, both times on evidence rather than
  argument. First when nine checks reddened: the draft had dropped the transaction condition
  silently, and the failures named the lost case. Then again when the owner asked why the
  transaction mattered at all — reading the two pinning specs showed they separate the outcomes by
  who raised the error, and that all three transaction specs skip off PostgreSQL. The simpler rule
  is the one that ships.

### 2026-10-01 · phase 5
- **Checks:** `bunx vitest run` 1823 in 133 files · `bun run check-types` clean ·
  `bunx oxlint .` 55 (the package baseline, unchanged) ·
  `bunx turbo run build --filter='./packages/*'` 10/10 ·
  integration 155 on PostgreSQL, 149 + 6 adapter-skipped on SQLite and on Mongo.
- **Gates:** sp-diff-checks clean (5 checks); sp-lint-delta 0 introduced, mode=two-run.
- **Reviewers:** correctness · regression · intent · tests, concurrent. Six findings; three
  reopened the work and are fixed below, two were accepted as contract amendments, one was
  referred out as not belonging to this change.
- **Criteria:** 8 met, 0 partial, 0 not-run, 0 not met — after two of them were narrowed to
  what their checks actually prove (3 and 7).
- **Left open:** three files in this working tree carry another session's edits —
  `wireTranslateRunner.ts` and `SyncRunnerProvider.ts` (comment deletions) and
  `enqueue-translation/handler.ts` (brace reformatting). None has a code change and none
  belongs to this task; they must be separated before anything is committed.

What the reviewers found that this task had got wrong, and what measured it:

- **A provider failure that killed the caller's transaction was being swallowed.**
  `translateOrWrap`, added earlier in this task to stop a bare `Error` from a host provider
  failing editors' saves, wrapped *everything* into `TransportError` (`mustPropagate = false`).
  A `TranslationProvider` is host code and may query Payload itself; if it does and that call
  throws, Payload has already rolled the caller's transaction back. Before this task the error
  propagated — `git show HEAD` confirms `translateContent` was called with no `try`/`catch` at
  all. So the task introduced exactly the "too lax" failure its own framing exists to prevent.
  Fixed: `translateOrWrap` now passes an `APIError` through as foreign and wraps only what
  carries no evidence that a Payload operation ran. Red first (`expected false to be true`),
  then green, then the fix mutated back out to confirm the check discriminates.

- **The enqueue endpoint lost the rest of its batch.** See the D2 amendment. Red first, then
  green; both halves of the restored condition were mutated out separately and each reddens a
  different check — the second mutation initially stayed green, which exposed a further gap
  (no case pinned "one of ours is swallowed *inside* a transaction"), and that case was added.

- **The auto-translate hook had no test for its propagate branch.** Deleting
  `if (mustPropagate(error)) throw error;` from the hook left all 13 of its checks green,
  while the two sibling call sites both reddened under the same mutation. A case was added and
  proved against that mutation.

- **Criterion 3 claimed more than its guard proves.** Narrowed, with the demonstration recorded
  on the criterion itself.

- **Verified and rejected:** an audit claim that a host rule's error text reaches an HTTP
  response. `permission-check-failed` is in the failure-reason catalogue, so
  `toClientErrorMessage` substitutes safe text. No change made.

- **Pin:** not set — the tree carries another session's uncommitted edits (above), so pinning
  this working diff would bless bytes this task never reviewed.

### 2026-10-01 · D2 resolved, one rule
- **Owner's call:** one rule everywhere — no transaction means no caller work a rollback could have
  taken, so swallow and log. The struck paragraph's SQLite judgement is not kept.
- **Fact corrected:** MongoDB does set `req.transactionID`; it never belonged in that paragraph.
  SQLite alone opens no transaction by default. Measured against the installed adapters, table in D2.
- **Gap closed:** SQLite behaviour was pinned by nothing (all three transaction specs carry
  `describe.skipIf(!POSTGRES)`). Added `no-transaction-keeps-the-save.int.test.ts`, SQLite-only,
  mirroring `transaction-validation-failure` with the opposite expectation. Proved by mutation:
  dropping `scope.transactionID != null &&` reddens it ("keeps the save, because no transaction
  carried it"), restored and green.
- **Checks:** unit 1823 · check-types clean · oxlint 55 · integration 150 on SQLite,
  155 on PostgreSQL, 149 on Mongo (156 cases, the rest adapter-skipped).

