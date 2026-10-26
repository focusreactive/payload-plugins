Build step: 2026-10-25-asking-payload-everywhere.design.md #8

## Task restatement

`identityOf` answers `{ requester: Requester | null }`, and that `null` carries **three** different
situations:

1. **nobody** — the request had no user. Deliberately trusted, and stays so (**SC1**).
2. **a user with no id** — unnameable.
3. **a user with no `collection`, in a project with more than one auth-enabled collection** —
   unnameable. The code already knows this is a downgrade: it logs *"It will be written without a
   permission check, as an unattributed one is"* and proceeds.

Cases 2 and 3 get the trust that was granted to case 1. This step separates them: `Identity` becomes
three-valued, the HTTP route refuses `unnameable`, and the auto-translate hook skips it rather than
enqueueing work nobody can be held to.

Covers **R2**. Out of scope: the module seam (#9), pins and `@since` (#10).

## Measured, not assumed

| Claim | Measured |
|---|---|
| `null` covers three cases | `identityOf.ts` — `!user \|\| user.id == null` (two of them) and the multi-collection fallthrough |
| the existing warning will become false | it says the translation *"will be written without a permission check"*; after this step it will not be written at all |
| two production callers | `enqueue-translation/handler.ts:108` and `AutoTranslateEnqueue.hook.ts:82`. No others |
| **Payload's own auth cannot produce an unnameable actor on HTTP** | `payload/dist/auth/strategies/jwt.js:55` — `user.collection = collection.config.slug`. The built-in strategy always stamps it |
| so who can? | a host's **custom auth strategy** returning a user without `collection`, and a **local-API** caller passing a hand-made `user`. Both are real, neither is in this repo |
| the branch is already covered by tests | `identityOf.test.ts` has a case for each of the three, asserting `{ requester: null }` today |
| step 6's prediction about 11 enqueue cases | **does not apply here.** That was about `mayInitiate` trusting a null *user*; this step changes `identityOf`, and those cases carry no user at all, which stays `nobody` |

## What already exists — platform · installed · project · verdict

| Rung | Found | Verdict |
|---|---|---|
| platform | Payload's `TypedUser` and its JWT strategy | **the reason the HTTP case is narrow** — the built-in path always names the collection |
| project | `identityOf` | the one place that reshapes; it is edited, not replaced |
| project | `Requester` / `asRequester` (`RequestScope.shapes.ts`) | unchanged — a named identity still produces exactly what it produced |
| project | `RequestScope` | unchanged; what changes is **who may build one** |

Nothing new is installed.

## Decisions

### D1 — a three-valued union, not a flag beside the requester

**Chosen:** `Identity = { kind: "named"; requester } | { kind: "nobody" } | { kind: "unnameable" }`.

**Rejected — `{ requester: Requester | null; unnameable: boolean }`.** Two fields that must agree:
it admits `{ requester: <someone>, unnameable: true }`, which the system never produces. States
admitted 4, produced 3 — a gap of 1, and the gap is exactly the confusion this step exists to remove.

### D2 — a scope cannot be built from an unnameable identity

**Chosen:** `scopeOf(identity: Exclude<Identity, { kind: "unnameable" }>): RequestScope`. A caller
must narrow before it can reach a scope.

**Rejected — `scopeOf(identity)` taking all three and returning `{}` for the unnameable one.** That
is the present bug with a new name: it would silently hand back the scope of *nobody*.

**Constraint cited:** this is the same move step 7 made at the queue — make the wrong call fail to
compile rather than documenting that it is wrong.

### D3 — `identityOf` keeps the diagnosis, callers own the consequence

The warning stays where the detail is (which branch, and how to fix it), but its **text changes**: it
currently promises the work proceeds unchecked, which stops being true. The hook adds one line saying
it skipped; the route needs none, because a `403` is the signal.

**Rejected — move the message to the callers.** It would be written twice, and neither caller knows
which of the two unnameable branches fired.

### D4 — what the HTTP route answers

**Chosen:** `403`, the same as any other refusal — a caller who cannot be named cannot be told apart
from one who is refused, which is the answer this plugin already gives everywhere else.

**Rejected — `400`.** It would say "your request is malformed", which is a different claim and leaks
that the actor was the problem.

### D5 — the no-user case is untouched

Verified, not assumed: `nobody` keeps producing `{}` and every path that trusted it still does.
`access-control-unattributed.int.test.ts` is the pin and must stay green **unchanged**.

### D6 — shape check

Triggers: a function's answer gains states; two values (`requester` and "was it nameable") would
otherwise travel together.

| | three-valued union *(chosen)* | `{ requester, unnameable }` |
|---|---|---|
| cost of the next kind | one member + the 2 exhaustive call sites | one more boolean, and every combination to reason about |
| states admitted vs produced | 3 / 3 — gap **0** | 4 / 3 — gap **1** |
| second caller in the repo | the enqueue route and the hook | same |
| breaks outside this repo | nothing — `identityOf` is not exported from `src/index.ts` | same |

## Acceptance Criteria

| # | Covers | Criterion | How it is checked (binding) |
|---|---|---|---|
| AC1 | R2 | `identityOf` answers `unnameable` for a user with an id and no `collection` when the project has more than one auth-enabled collection | a case in `identityOf.test.ts` |
| AC2 | R2 | …and for a user object with no id | a case in the same file |
| AC3 | R2 | …and `nobody` when there is no user at all — distinct from both | a case asserting the kind, not just the absence of a requester |
| AC4 | R2 | `POST /translate/enqueue` answers `403` for an unnameable actor and queues nothing | a case in `enqueue-translation/__tests__/` asserting `runner.enqueue` was not called |
| AC5 | R2 | The auto-translate hook enqueues nothing for an unnameable actor, and warns | a case in the hook's suite |
| AC6 | R2 | A scope cannot be built from an unnameable identity | a `@ts-expect-error` pin; `check-types` is the check |
| AC7 | R2 | The no-user case is unchanged | `access-control-unattributed.int.test.ts` stays green **and unmodified** |
| AC8 | R5 | The baseline holds | real `turbo build` green; integration **225 passed / 8 skipped** |

## Pre-flight — against the CURRENT tree

| # | Polarity | Now | Evidence |
|---|---|---|---|
| AC1–AC3 | must FAIL | **fail** | `identityOf` returns `{ requester: null }` for all three; `grep Identity src/server/shared/payload/identityOf.ts` finds no union |
| AC4–AC6 | must FAIL | **fail** | neither caller branches on it; there is no `scopeOf` |
| AC7, AC8 | must PASS | **pass** | 202 files / 2559 checks, build green, 225/8 |

## Risk notes

**High risk — it changes who is trusted**, in both directions.

- **The narrowness is the thing to be honest about.** Payload's own auth always stamps the collection,
  so this guards a case the plugin cannot produce by itself. It is reachable through a host's custom
  auth strategy or a local-API caller passing a hand-made user — real, but not exercised here.
- **The opposite error is worse than the one being fixed:** treating *nobody* as unnameable would
  refuse every legitimate in-process caller. AC7 is the guard, and it must pass **without the
  integration test being edited**.
- **A message that is about to become false** is being changed, not deleted; a reader who has seen the
  old log line will otherwise believe the old behaviour.
- A test is required before done; the regression sweep names what was grepped; Phase 5b runs several
  angles.

## Human choices

**2026-10-25.** Uninterrupted run through steps 5–10, stopping only at a genuine fork. None arose:
D1, D2 and D5 follow decisions already recorded (the design's D6, SC1, and step 7's "make it not
compile"), and D4 follows the answer this plugin gives on every other refusal. Commit authority
granted in advance; no push, no pull request.

## Criteria results

| # | Outcome | Evidence, by the check the criterion named |
|---|---|---|
| AC1–AC3 | met | 6 checks in `identityOf.kinds.test.ts`, all three kinds told apart |
| AC4 | met | `handler.unnameable.test.ts` — 403 and `runner.enqueue` not called; **mutation**: removing the refusal reddens it |
| AC5 | met | two checks in the hook's identity suite; **mutation**: removing the skip reddens both |
| AC6 | met | two `@ts-expect-error` pins; **mutation**: widening `scopeOf` to all three kinds produces 2 type errors |
| AC7 | met | `access-control-unattributed.int.test.ts` green and **unmodified** — `git status` on that path is empty |
| AC8 | met | real `turbo build` green, forced; integration **225 passed / 8 skipped** |

## Review log

**2026-10-25 — what the investigation established before any code changed.**

- The `null` covered **three** situations, and the code already knew one of them was a downgrade: it
  logged *"It will be written without a permission check, as an unattributed one is"* and proceeded.
- **Payload's own auth cannot produce an unnameable actor over HTTP** —
  `payload/dist/auth/strategies/jwt.js:55` sets `user.collection` itself. So this guards a case the
  plugin cannot reach on its own; it is reachable through a host's custom auth strategy or a
  local-API caller passing a hand-made user. Recorded rather than overstated.
- Step 6's prediction about 11 enqueue cases **did not apply**: it was about `mayInitiate` trusting a
  null *user*, and those cases carry no user at all, which stays `nobody`.

**`/sp-complexity`.** Neighbourhood 5 files. **One finding, fixed and proven by probe:**
`PlaceableIdentity` was `Exclude<Identity, { kind: "unnameable" }>`, which makes any **future** kind
placeable by default. Adding a fourth kind and passing it to `scopeOf` produced **0** errors under
`Exclude` and **1** under `Extract<Identity, { kind: "named" | "nobody" }>`. Now the placeable kinds
are named rather than subtracted, so tomorrow's state is refused until someone decides otherwise.

Also traced the second door into a scope and confirmed it is not a hole: `PayloadJobsRunnerProvider`
rebuilds a scope from the **stored** job row, which was filtered at enqueue time. Rows written before
this step carry a null requester and still read as `nobody`.

**`/sp-abstraction`.** Audited by the author. Measures: honesty 3 states admitted / 3 produced, gap 0.

- **Finding, fixed:** the two `unnameable` branches were asymmetric. "No `collection` with several
  auth collections" logged a detailed diagnosis; **"no `id`" returned the same answer silently**, so a
  host would have got a `403` with no explanation. Both now say why, mutation-proven.
- **A suspicion of mine, measured and confirmed:** `scopeOf` returning `{ requester: null }` rather
  than `{}` is observed by **no reader** — `rebuildRequester` and the four `scope.requester?.…` sites
  treat null and undefined identically. Exactly one test sees it. Kept anyway, because AC7's promise
  was that the no-user case is untouched; recorded as a contract with a test, not with readers.

**`/sp-red-test` in audit mode.** Stubbing `identityOf` reddened **52 checks across 9 files** — both
identity suites, four enqueue suites and three auto-translate suites. **No toothless check found.**
Scaffolding deleted, `git status` shown.

**`/sp-review-comments`.** 8 blocks, 8 verdicts: 4 KEEP, 3 REWRITE-COMMENT, 1 REWRITE-CODE. Inline
density 0.5 per 10.

Two of my own claims were overstated and are corrected:

- The hook's comment said a throw inside `afterChange` *"would roll back the save"*. Checked
  `swallowOrThrow`: it rethrows **only** when the caller is inside a transaction **and** the error
  does not declare itself harmless. The comment now names that mechanism instead of the broad claim.
- `scopeOf`'s docblock implied a downstream reader depends on the explicit `null`. None does, so the
  sentence would have stopped someone changing it for a reason that is not true. Cut.

The REWRITE-CODE verdict removed a dead branch rather than explaining it: `named()` handled
`asRequester` returning null, which cannot happen because both arguments are guarded above. A
**non-null overload** on `asRequester` makes that structural — the branch and its comment are gone,
and no cast was introduced.

**Found outside its own remit, and it was real:** the hook's warning check asserted
`stringContaining("auto-translate skipped")`, which **also matches the hook's other skip message**
("no source locale resolvable"). Tightened to the actor wording; a mutation substituting the other
message now reddens it, where before it would have passed.

### Verification after every fix

`check-types` 0 · oxlint 43 warnings / 0 errors (baseline) · package suite **204 files / 2570
checks**, up from 202 / 2559 by exactly +2 files and +11 checks (6 identity kinds, 3 enqueue refusal,
2 hook skip) · real `turbo build` green, forced · integration **225 passed / 8 skipped**, with the
pinned unattributed test green **and unmodified** · `sp-diff-checks` clean · `sp-lint-delta`
introduced nothing.

### Owed to step 10

A release-note line: a host whose custom auth strategy returns a user without `collection` now gets a
`403` on enqueue and a skipped auto-translate, where before the work proceeded with the host's rules
off.
