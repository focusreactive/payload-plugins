# Task contract — one home for the swallow-or-propagate rule

**Risk: HIGH.** The rule decides whether an editor's save survives a failure. It is shared by
four call sites, a mistake is silent (a success reported over a rolled-back write), and this
change moves it rather than adding to it.

## Requirements / Task restatement

Lift the swallow-or-propagate rule out of its inline copies into one named helper, for two
reasons that are not the same reason:

1. **The copies have already diverged.** `SyncTaskRunner.ts:66` reads
   `scope.transactionID != null && mustPropagate(error)`; `AutoTranslateEnqueue.hook.ts:88` and
   `Provenance.service.ts:104` read only `mustPropagate(error)`. A reviewer found that, not a check.
2. **Inline is actively unsafe here.** Payload's `killTransaction` does `delete req.transactionID`
   (`killTransaction.js:11`) right after rolling back. Read in a `catch`, `undefined` means two
   opposite things — there never was a transaction, or there was one and it just died. The fact has
   to be taken *before* the work runs. Inline code must remember to hoist a variable above the `try`;
   a helper taking `scope` as a parameter does it by construction.

**This is not a behaviour-preserving extraction, and that is the point.** Unifying the rule changes
two of the four sites — see D5 and the gate question.

## What already exists — platform · installed · project · verdict

- **Platform / installed libraries:** nothing. The rule is this plugin's own domain question ("did a
  Payload operation run, and does this caller have work a rollback could have taken"). Payload
  exposes `killTransaction` and `APIError`, neither of which answers it. No search result to cite
  because there is nothing to cite.
- **Project:** strong precedent for the *shape*. Four higher-order helpers already exist —
  `withErrorHandler` (`server/shared/http/withErrorHandler.ts:11`), `withAccessCheck`,
  `withQueuedNotification`, `withAutoTranslate`. `withErrorHandler` is the same idea one layer out:
  wrap work, catch, decide. The package also habitually names helpers as full sentences
  (`dropLocalesTheProjectDoesNotHave`, `markEvictable`), so a long honest name is the idiom, not a
  deviation.
- **Verdict:** build the helper, in the project's existing shape and naming. Nothing to reuse.

## Decisions

**D1 — a function that takes the work, not one that returns a wrapped function.**

    swallowOrThrow(scope, work, onFailure): Promise<T | undefined>

Rejected: `withErrorHandler`'s own shape (`withX(fn) => fn`), despite being the precedent. The
constraint that kills it is `SyncTaskRunner`: its `catch` sits **inside** the `for` loop (loop at 24,
catch at 62) and its failure branch closes over the per-task `task` variable. The wrapped function
would have to be rebuilt inside the loop for every task — all of the indirection, none of the reuse.
The hook has the same shape: its failure branch logs `doc.id` and `collection.slug`, per invocation.

Rejected: **a predicate only** — keep each `try`/`catch` and merely widen `mustPropagate` to
`shouldPropagate(scope, error)`. It fixes the divergence and is the smaller change, so it deserved a
real look. It loses on reason 2 above: the hook has no scope variable at its catch — it reads
`await req.transactionID` *inside* the `try` (line 76) — so a predicate taking scope would force the
hook to hoist a variable above the `try`, which is exactly the shape the previous task's criterion 7
removed. A predicate cannot guarantee the fact is read early; a parameter can.

**D2 — three positional parameters, no options object, ever.**
`onFailure` takes the error and returns `void`. It cannot return a value and cannot change the
decision. That is what makes the options bag impossible: there is no object to add a key to, and the
one callback has no say in the outcome. If a fourth thing is ever needed, that is a new design, not
a new field.

**D3 — returns `T | undefined`; `undefined` means "swallowed".**
Rejected: `Promise<void>`. Three of the four callers ignore the value, but `getStaleness` (D5) needs
it: its work returns the fingerprint it then pushes. `void` would exclude that caller from the one
helper and leave the fourth copy in place, which is the thing being removed.

**D4 — placement: `server/shared/payload/`.**
It needs `RequestScope` (server) and `mustPropagate` (core). Rejected: `core/errors/`, next to
`mustPropagate` — `src/core` may not import `payload` (`oxlint.config.ts`), and `RequestScope` is a
server concept. Confirmed server-only is right today: `mustPropagate` appears nowhere in `src/core`
outside `core/errors/` itself. **Recorded so the first `core` case does not quietly start a fourth
copy:** if `core` ever needs this rule, that is a design question, not an import.

**D5 — which catches join, answered one by one.**
`Provenance.service` has three; the brief asked for a verdict on each.

| catch | what it guards | joins? |
|---|---|---|
| `captureFingerprint` (~68) | `computeSourceFingerprint` — pure CPU, no Payload call | **no.** Nothing can have rolled back. Keeps its `return null`. |
| `record` (~95) | `store.upsert` — a Payload write, scope may carry the editor's transaction | **yes**, already has the rule |
| `getStaleness` (~131) | `fetchSourceDocument` via `makeCurrentFingerprint` (line 179) — a Payload **read** | **yes.** It does call Payload and has no rule today — the fourth divergence. |

`getStaleness` is behaviour-neutral today: its only caller builds the service with no scope
(`getDocumentStaleness.handler.ts:30` → `provenanceServiceFactory?.(req.payload)`), so the rule
evaluates to swallow, which is what it already does. It joins so the answer is uniform and explicit
rather than absent.

**D6 — this is a trade, declared as one.** CHANGE 4 → 1; READ rises by 1 (a new file every call site
sends you to). It is admitted not as tidiness but because the divergence it removes is a silent
correctness bug: the four copies disagreed, nothing caught it, and the cost of the disagreement is an
editor told "saved" over a row that no longer exists.

**New surface:** one function, four callers, all four already in the codebase.

**Written contract owed:** yes — when it swallows versus throws, that `onFailure` runs either way,
that `scope` is read at entry and not at the catch, and that `undefined` means swallowed.

**`/sp-red-test`?** No, and deliberately. The behaviour is not new: it is pinned by 40 existing spec
cases across the three sites plus three integration checks. What is new is the name and the
read-at-entry guarantee. The discipline that fits is red-first per changed behaviour plus the
mandated mutation on both halves at every site — not a blind author re-deriving a rule the contract
above already states.

**Escalate to `/sp-architect`?** No. One helper, one layer, no new seam, no data-model change.

## Acceptance Criteria

| # | Criterion | How it is checked | Passes when |
|---|---|---|---|
| 1 | The rule has exactly one definition | `grep -rn "mustPropagate(error)" src` | hits only inside the helper file |
| 2 | All four sites route through it | `grep -rn "await swallowOrThrow(" src \| grep -v __tests__` | exactly 4 call sites — hook, `record`, `getStaleness`, `SyncTaskRunner` |
| 3 | The transaction fact is read before the work | `grep -rn "req.transactionID" src/server --include-catch` plus a unit case: the hook, given a `req` carrying a `transactionID`, still propagates a foreign error | zero reads inside any `catch`; the case is green and reddens if the helper reads scope lazily |
| 4 | Both halves discriminate **at every site** | per site: drop `callerAtRisk &&`, run that site's spec; then drop `mustPropagate(error)`, run it again | each mutation reddens at least one case, and the two mutations redden *different* cases |
| 5 | The hook and `Provenance.record` follow the one rule | new cases: with a transaction a foreign error propagates; without one it is swallowed and logged | both green at both sites |
| 6 | `getStaleness` behaviour is unchanged | baseline — its existing cases and the staleness endpoint's cases, recorded green before the change | same cases green after |
| 7 | `captureFingerprint` deliberately does not join | it keeps its own `try`/`return null`; stated in D5 | no helper call in that method |
| 8 | Checks clean | `bunx vitest run` · `bun run check-types` · `bunx oxlint .` · `bun run build` then from `apps/dev` the three adapter suites | ≥1823 unit, types clean, lint 55, integration 150 SQLite / 155 Postgres / 149 Mongo |

## Pre-flight

**Baseline: the working tree, not `HEAD`.** The predecessor task
(`2026-09-30-typed-errors-instead-of-a-rollback-guess`) is finished but still uncommitted in this
same tree, so `git show HEAD:` is two tasks behind and shows `killedTheCallersTransaction`, which no
longer exists here. Every row below was run against the working tree as this task found it. A reader
checking these numbers against `HEAD` will get different ones and should not conclude the table lies.


| # | command | result | kind |
|---|---|---|---|
| 1 | `grep -rn "mustPropagate(error)" src \| wc -l` | **3** | change — fails now ✓ |
| 2 | `grep -rn "await swallowOrThrow(" src \| grep -v __tests__ \| wc -l` | **0** | change — fails now ✓ |
| 3 | `grep -rn catch -A6 src/server \| grep -c req.transactionID` | **0** | invariant — holds now ✓ |
| 4 | the two `SyncTaskRunner` mutations | one reddens, the other reddens a different case | change — at the hook and `Provenance` neither half is pinned, so it fails now ✓ |
| 5 | `hookArgs` (`AutoTranslateEnqueue.hook.test.ts:56`) builds `req` with **no** `transactionID` | so today's hook case passes *because* the hook has no transaction check | change — fails now ✓ |
| 6 | `bunx vitest run` | 1823 in 133 files | invariant — holds now ✓ |
| 7 | read of `Provenance.service.ts` | one `try` in `captureFingerprint`, no rule | invariant — holds now ✓ |
| 8 | all check commands | unit 1823 · types clean · lint 55 · integration 150/155/149 | invariant — holds now ✓ |

## Risk notes

- **The behaviour change is the risk.** On a path with no transaction, the hook and
  `Provenance.record` currently *propagate* a foreign error and would afterwards *swallow* it. That
  follows the one-rule decision recorded in the previous task's D2 amendment, but it is a real change
  on a high-risk path and it is the gate question.
- **A throwing helper inside a loop abandons the rest of it.** That was the `SyncTaskRunner` bug
  fixed yesterday. `getStaleness` has the same shape — a `for` over locales. Today its rule can never
  fire (no scope), but if a caller ever hands it one, a propagating failure would drop the remaining
  locales. Noted, not solved here.
- **The helper hides the `throw`.** Mitigated only by the name, which is why the name is long.

## Human choices

- **2026-10-01 — one rule everywhere, behaviour change accepted.** The gate named the consequence
  explicitly: on a path with no transaction the hook and `Provenance.record` propagate a foreign
  error today and will swallow it afterwards. Chosen over a `requireTransaction` parameter that
  would have preserved behaviour bit-for-bit, because that parameter is the options bag D2 exists to
  prevent and would leave the rule as two rules in one file. Chosen over leaving `getStaleness` out,
  which would have left the fourth divergence alive.
- **2026-10-01 — the name is `swallowOrThrow`, proposed by the owner**, after
  `bestEffortUnlessCallerAtRisk` was built and judged unreadable: it named the policy where the
  reader was looking for the verb. The replacement names the two outcomes **as the call site sees
  them** — the failure disappears, or it arrives. `throw` is a keyword, so a reader scanning for
  "can this line throw?" finds the literal word; that is the only mitigation available for a helper
  that moves a `throw` out of its call site.
  Rejected along the way: `bestEffortUnlessCallerAtRisk` (names the policy, not the outcome, and
  buries the throw in a subordinate clause); `swallowOrPropagate` (echoes the `mustPropagate` flag,
  but `propagate` is a domain word a newcomer must look up where `throw` is not); `catchOrThrow`
  (**wrong**: the helper catches *every* failure and then decides, so "catch or throw" misdescribes
  the mechanism, and "caught" is not an outcome the caller can observe); and
  `runUnlessItWouldHideALostSave` (most precise about the harm, too heavy at four call sites).
  **Accepted cost:** the name no longer says *when* it throws. That condition now lives in the
  docblock and in the two checks that redden when either half of it is dropped.

## Review log

- 2026-10-01 — contract written. Phase 1 found two things the brief did not have: `getStaleness`
  calls Payload through `fetchSourceDocument` and has no rule (a fourth divergence), and `hookArgs`
  builds a `req` with no `transactionID`, which is why today's hook case passes and why unifying the
  rule changes that site's behaviour.

### 2026-10-01 · sp-task phase 5
- **Checks:** `bunx vitest run` **1837 in 134 files** · `bun run check-types` clean ·
  `bunx oxlint .` **55 warnings, 0 errors** (the baseline) ·
  `bunx turbo run build --filter='./packages/*'` 10/10 (the command CI actually runs) ·
  integration **150 SQLite / 155 PostgreSQL / 149 Mongo** of 156, the rest adapter-skipped.
- **Gates:** sp-diff-checks clean (5 checks); sp-lint-delta 0 introduced, mode=two-run.
- **Reviewers:** correctness · regression · intent, concurrent. correctness and regression returned
  **no findings**, each after tracing the risky edits to Payload's own source. intent returned four.
- **Criteria:** 8 met, 0 partial, 0 not-run, 0 not met — after criterion 2 was rewritten (below).
- **Left open:** three files in this tree carry another session's edits and belong to no task here —
  `wireTranslateRunner.ts`, `SyncRunnerProvider.ts`, `enqueue-translation/handler.ts`. They must be
  separated before anything is committed.

What the reviewers changed:

- **Criterion 4 was not met for the fourth site.** `getStaleness` joined the rule with no test of
  either half — the mutation matrix had four rows, but the `Provenance` row was covering `record`.
  Three cases added: a locale that cannot be recomputed is dropped and the loop continues (no
  transaction); a foreign failure propagates (in a transaction); one of ours is swallowed (in a
  transaction). Both halves now redden two cases each at that site. This is the finding of the run.
- **Criterion 2 counted the wrong thing.** It read `grep -rln … | 5 files`, which counts files and
  is inflated by the helper's own spec importing the symbol; two of the four call sites share
  `Provenance.service.ts`, so the file count could never have proved "four sites migrated". Rewritten
  to count `await swallowOrThrow(` outside `__tests__` — now exactly 4. I had noticed
  the same slip in Phase 4 and recorded it; the reviewer showed it was worse than a wording problem.
- **Two intent findings rested on the wrong baseline** and are rejected, with the cause fixed.
  Both argued from `git show HEAD:`, which is two tasks behind: the predecessor typed-errors work is
  finished but still uncommitted in this tree, so at `HEAD` there is no `mustPropagate` at all and
  all three sites still call `killedTheCallersTransaction`. The pre-flight numbers were measured
  against the working tree as this task found it, where the divergence this task removes was real
  and visible. A `## Pre-flight` preamble now states the baseline so the next reader is not sent the
  same way.
- **Two lint errors, mine.** The three new `getStaleness` cases used
  `async () => Promise.reject(…)`, which `unicorn(no-useless-promise-resolve-reject)` rejects —
  caught by the run going from 0 errors to 2, not by a reviewer. Rewritten as `throw`.

- **Pin:** not set — the tree carries another session's uncommitted edits, so pinning this working
  diff would bless bytes this task never reviewed.

