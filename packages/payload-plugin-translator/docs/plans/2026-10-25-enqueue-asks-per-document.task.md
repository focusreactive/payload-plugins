Build step: 2026-10-25-asking-payload-everywhere.design.md #5

## Task restatement

`POST /translate/enqueue` takes a list of document ids and queues a translation for each. Nobody
asks, per document, whether the caller may change it. That is **gap 4** of the six measured.

This step asks the host's `update` rule about each named id, drops the refused ones, and says which
they were. Covers **R2** (every entry point asks) and **R5** (the six gaps close).

Out of scope by the design's own sequence: jobs resolving to documents (#6), the brand at the queue
sink (#7), the three-valued identity (#8), the module seam (#9), pins and `@since` (#10).

## Measured, not assumed

| Claim | Measured |
|---|---|
| the explicit-id path is unchecked | `handler.ts` passes `collection_id` straight into the task list; the only filter on the other branch is `getAllCollectionIds`, which is read-only |
| `select_all` is already read-filtered | `getAllCollectionIds` → `payload.find({ ...enforcedAtTheRead(user) })` |
| the client would see a refusal | **no** — `useQueueDocumentTranslation` types the response `{ data: null }` and reads nothing from the body |
| the integration suites read the body | **yes** — seven of them read `queued` or `assignments` |
| the worker refuses before spending | **yes** — `translateDocument.ts:40` `readSourceIfAllowed()` precedes `translateOrWrap` at `:54` |
| a refused caller already gets a silent empty answer | **pinned** — `read-access-reports.int.test.ts`: `select_all` for a caller who may read nothing answers `queued: 0` and success, not an error |

## What already exists — platform · installed · project · verdict

| Rung | Found | Verdict |
|---|---|---|
| platform | Payload folds a **read** rule into the query (`collections/operations/find.js`) | that is why `select_all` costs one query. The **update** rule cannot be folded — `docAccessOperation` answers per document |
| project | `mayInitiate` (`shared/access/permission.ts`, step 3) | **the mechanism**, unchanged |
| project | `visibleIds` (`shared/payload/collections.ts`, step 2) | **the read-side twin** of what this step adds: same arguments, same return-a-set shape. The new function copies its signature deliberately |
| project | `ServerResponse.success` with a conditional `assignments` key | the precedent for reporting an optional extra without changing the ordinary body |

Nothing new is installed.

## Decisions

### D1 — a refused document is dropped, not a reason to fail the request

**Chosen:** queue what the caller may change, skip what they may not, and name the skipped ones in
the response.

**Rejected — `403` for the whole request when any id is refused.** A bulk selection of fifty with two
refused would lose the forty-eight the caller is entitled to.

**Constraint cited:** the project already answered this question once and pinned the answer.
`read-access-reports.int.test.ts` asserts that `select_all` for a caller who may read nothing returns
`queued: 0` **and success**. Failing the explicit path would be a second, contradictory answer to the
same question on the same route.

### D2 — `refusedTargets` is written now, with one caller

The design names it with two callers. **Only one exists today** — this handler. Step 6 is the second
and is not in the codebase yet, so under the owner's rule this does not yet earn an abstraction.

**Chosen anyway, and here is what carries it:** `visibleIds` already sits in the shared layer as the
read-side form of exactly this question, with exactly this signature. The update-side twin belongs
beside it rather than inlined in one handler, and placing it there is what lets step 6 ask the same
question without copying a loop. Recorded as a deliberate exception, not an oversight.

**Rejected — inline the loop in the handler.** It would put a permission loop inside a feature, which
is the shape steps 1 and 2 moved out of the features layer on purpose.

### D3 — the refused ids ride the existing success body

**Chosen:** `refused` appears in the response **only when non-empty**, like `assignments`.

**Rejected — always include it.** Every ordinary request's body would change for no reader: the
client types the response `{ data: null }` and reads nothing.

### D4 — `select_all` keeps its read filter and gains no per-document ask

Adopted from the design, and the cost is why: the update rule cannot be folded into a query, so
asking it under `select_all` would be one `docAccessOperation` — each of which loads the document —
per document in the collection.

**The backstop, verified rather than assumed:** the worker asks again with the real data before it
spends. `readSourceIfAllowed()` runs at `translateDocument.ts:40`, `translateOrWrap` at `:54`. So a
document that slips through `select_all` costs a queue row, not a provider call.

**The asymmetry is real and recorded:** a caller who passes explicit ids is told what was refused; a
caller who passes `select_all` is not. Both end in the same place.

### D5 — one question per document, not one per document and locale

A request fans out to `document × locale` tasks, and `mayInitiate` takes a `targetLocale`, so asking
once per task looked like the honest reading. **It is not, and the owner caught it.**

Payload's `Access` function receives `{ collectionConfig, data, id, isReadingStaticFile, req }`
(`payload/dist/config/types.d.ts:232`) — **no locale argument, and no concept of per-locale
permissions.** Rights are granted on a document. The locale reaches a rule only as ambient
`req.locale`, and its only effect is which language copy Payload loads into `data`.

Sharper still: `mayInitiate` asks with **empty `data`** on purpose, and its own docblock says a rule
branching on the payload answers a different question there. Splitting by locale would be precision
laid over a probe that is deliberately approximate.

**Chosen:** one question per document. `refusedTargets` takes ids, as the design said.

**Rejected — one question per `(document, locale)` task.** It multiplies the cost by the number of
target locales to cover a case Payload does not model, and the answer could only differ for a host
that hand-reads `req.locale`.

**Which locale is passed is immaterial** for the reason above; the request's first resolved target is
used, so the call reads the same as the two single-document callers.

### D6 — the per-document cost of the explicit path

N named ids means N permission evaluations, each loading its document. Bounded by what the caller
listed, which the admin dashboard fills from a page of selected rows. No cap is added: a cap would be
a silent truncation, which is the failure D1 just rejected. Recorded so a later step can measure it
rather than discover it.

### D7 — shape check

Triggers that fired: a function gains a response field (`refused`), and a new exported function is
added. Not fired: no published type changes, no parameter added to an exported function.

| | `refused: string[]` on the body *(chosen)* | a per-id result list `[{id, queued|refused}]` |
|---|---|---|
| cost of the next outcome of this kind | one more optional key | one more member of a union every reader must handle |
| states admitted vs produced | ids that were named and refused — 0 gap | admits "queued and refused", which cannot happen |
| second caller already in the repo | the integration suites read the body | same |
| breaks outside this repo | nothing: the key is additive and absent when empty | every reader of `queued` would have to be rewritten |

**Chosen:** the first. The second describes a richer answer nobody asked for and makes `queued`
redundant.

## Acceptance Criteria

| # | Covers | Criterion | How it is checked (binding) |
|---|---|---|---|
| AC1 | R5 | A named id the `update` rule refuses is not queued | a case in `enqueue-translation/__tests__/` asserting the task list passed to `runner.enqueue` excludes it |
| AC2 | R5 | The other named ids in the same request **are** queued | the same case asserts the allowed id is still present — a refusal is not a blanket one |
| AC3 | R2 | The response names the refused ids | the same case reads `refused` from the body |
| AC4 | R5 | An ordinary request's body is unchanged — no `refused` key when nothing was refused | an existing success case still deep-equals what it asserted before |
| AC5 | R2 | The ask happens before `runner.enqueue`, so a refused document never reaches the queue | **mutation**: move the filter after the `enqueue` call and AC1 must go red |
| AC6 | R5 | `select_all` is unchanged — still read-filtered, still no per-document update ask | a case asserting `refusedTargets` was **not called**; **mutation**: make `select_all` ask and it must go red. *(Strengthened mid-build: the original check — "the existing cases stay green" — was run as a mutation and stayed green, so it guarded nothing. Those cases pass no user, and a null user is allowed without reaching Payload.)* |
| AC7 | R2 | An actor-less enqueue behaves exactly as it does today | the three integration suites that enqueue with no user stay green |
| AC8 | R5 | The baseline holds | real `turbo build` green; integration **225 passed / 8 skipped** |

## Pre-flight — each check run against the CURRENT tree

| # | Polarity | Result now | Evidence |
|---|---|---|---|
| AC1 | must FAIL | **fails** | `grep refusedTargets src` → no matches; the handler passes `collection_id` through untouched |
| AC2 | must FAIL | **fails** | same case does not exist |
| AC3 | must FAIL | **fails** | the body has no `refused` key |
| AC4 | must PASS | **passes** | the success cases pass today |
| AC5 | must FAIL | **fails** | there is no filter to move |
| AC6 | must PASS | **passes** | `select_all` cases and the integration suite pass today |
| AC7 | must PASS | **passes** | those suites pass today |
| AC8 | must PASS | **passes** | 196 files / 2523 checks, build green, 225/8 |

## Risk notes

**High risk.** This changes who may start a translation, and a translation spends money.

- **The silent-drop hazard.** D1 drops refused ids. If the response did not name them, a caller would
  believe work was queued that never was. AC3 is the guard, and it is why `refused` exists at all.
- **The cost of N evaluations** (D5) is the thing most likely to surprise someone later.
- **The asymmetry with `select_all`** (D4) is the thing most likely to be re-raised in review. It is
  settled by the design and backstopped by the worker; the review log should say so once.
- A test is required before done, the regression sweep is evidenced, and Phase 5b runs several angles.

## Criteria results

| # | Outcome | Evidence, by the check the criterion named |
|---|---|---|
| AC1 | met | `handler.access.test.ts` — "does not queue a document the update rule refuses"; mutation M1 (drop the filter) reddens it |
| AC2 | met | same file — "still queues the documents in the same request that it allows"; M1 reddens it |
| AC3 | met | same file — "names the refused documents in the answer"; mutation M2 (drop the `refused` key) reddens it alone |
| AC4 | met | same file — "says nothing about refusals when there were none"; green before and after, by design |
| AC5 | met | M1 is the ordering proof: with the answer unused, three checks go red |
| AC6 | met | "asks nothing per document when the caller said `select_all`"; mutation M3 reddens it alone. **The criterion was strengthened mid-build** — its original check stayed green under M3 and so guarded nothing |
| AC7 | met | 39 integration files enqueue without a user; all unchanged and green |
| AC8 | met | real `turbo build` green (forced, uncached); integration **225 passed / 8 skipped**, unchanged |

All three mutations were re-run after `/sp-review-comments` merged the doubled `select_all` branch,
and each still reddens exactly its own check.

## Human choices

**2026-10-25.** The owner directed an uninterrupted run through steps 5–10, stopping only at a
genuine fork. No fork arose here: D1 was settled by the pinned integration test, D4 by the design,
and D2 is recorded as a deliberate exception rather than a question. Commit authority for these steps
was granted in advance; no push, no pull request.

## Review log

**2026-10-25 — adversarial review of the guarantee.** One angle, asked to find any way to queue a
named id the `update` rule refuses. **No bypass found.** `runner.enqueue` is reachable from exactly
two places in `src` — this route and the auto-translate hook — and in this handler the ids reach the
task list only through `documentsToQueue`. Id coercion was checked for a mismatch between the id that
is *asked about* and the id that is *filtered*: there is none, because both read the same string.

One finding fixed here: **`collection_id: [""]` passed the schema.** Only the array carried
`.nonempty()`, not its elements. Payload's `getEntityPermissions` sets `fetchData: id ? true : false`,
so an empty id **skips the document load entirely** and the rule is asked about nothing — a rule that
grants by role would say yes, and `""` would be queued. Confirmed by probe, then fixed with
`.nonempty()` on the element, red-first and mutation-proven.

Four caveats, none a bypass, all recorded rather than changed:

- **`select_all: true` with a named list ignores the list** and queues everything readable — identical
  to the behaviour before this step, so not a widening. The worker is the backstop, verified again:
  `readSourceIfAllowed` (`targetDocument.ts:121-147`) throws `TranslationRefused` before
  `translateOrWrap`. The difference is only in reporting — there a refusal surfaces as a failed task,
  not under `refused`.
- **A duplicate id** is evaluated once per occurrence and reported once (`refused` is a `Set`); a
  permitted duplicate is queued twice. Neither old nor new code de-duplicates.
- **A nonexistent id** is queued, because `absenceIsNotARefusal` (step 3) deliberately does not read
  absence as a refusal. The worker's own read reports it.
- **`docAccessOperation` evaluates every operation's rule, not just `update`.** A host rule for
  `create`, `read`, `delete`, `readVersions` or `unlock` that throws on empty `data` fails the whole
  request with a 500 rather than refusing one id. Same on every route that already uses `mayInitiate`.

**2026-10-25 — `/sp-complexity`.** Neighbourhood 7 files, 20 commits. Both scenarios confirmed by
history: "a route starts asking about a document" (3 occurrences) and "the enqueue answer changes
shape" (3). One fix applied and then **reverted** in the same run: `targets[0] ?? ""` was replaced by
a destructure-and-check so an unreachable empty locale would stop existing in the type — and then the
abstraction audit removed the locale parameter entirely, which took the reason away. Recorded because
a reverted fix is still a fact about the code. For the scenario "add a fourth place that asks about a
document": CHANGE 1, READ 3, STATE 4 — nothing to propose.

**2026-10-25 — `/sp-abstraction`** on `refusedTargets`. Audited by the author. Two findings applied,
one recorded.

- **Position, not name, bound two string parameters.** Proven by probe: a call with `collection` and
  `targetLocale` swapped **compiled silently**, because `CollectionSlug` resolves to `string` when the
  host has no generated types — which is every plugin consumer. Fixed: the signature takes one named
  object. Interchangeable string parameters 2 → 0.
- **`targetLocale` demanded what the answer does not depend on**, and the docblock never mentioned it,
  so a caller could not tell whether it mattered. Removed; `refusedTargets` now names the project's
  default locale itself, with the reason in one line. Parameters 5 → 4 (and the caller stops passing a
  value it had to invent).
- **Recorded, not fixed:** the enqueue response body is typed `unknown`
  (`ServerResponse.success(data: unknown = null)`), so the new `refused` key is invisible to the
  type-checker and to every consumer. It exists only because a test asserts it. This is a boundary the
  author's own brief had omitted.

**2026-10-25 — `/sp-review-comments`.** 3 candidate blocks, 3 verdicts: 1 REWRITE-COMMENT,
1 REWRITE-CODE, 1 DELETE. Density on the tracked diff was **2.7 inline comment lines per 10 lines of
code** — judged too dense, and both offending blocks are gone.

The substantive half was the `refusedTargets` docblock, which stated **three things that were not
true**. Two were caught by the mechanical check before the auditor saw them; the third was the
auditor's:

1. *"this probe hides that anyway by asking with empty data"* — the reverse. `getEntityPermissions`
   treats `{}` as "no data supplied", so Payload **fetches the document in `req.locale`** and hands it
   to the rule. Empty data is what *causes* the locale-specific read.
2. *"Payload's `Access` function receives no locale"* — overclaimed. `AccessArgs` carries no locale
   field, but it carries `req`, and `createLocalReq` sets `req.locale`. Only "no per-locale permission
   entries" is true, which is what D5 actually rests on.
3. *"No locale is asked for"* — **the docblock contradicted its own function body**, which passes the
   project's default locale.

The REWRITE-CODE verdict found a split predicate the comment was covering for: the handler branched
on `select_all` **twice**, once to produce an empty `refused` placeholder and once to pick the ids.
Merged into one `documentsToQueue` with an early return per mode, so each mode shows its own gate and
the comment has nothing left to do. The three mutations were re-run against the new shape and each
still reddens exactly its own check.

**Recorded, not fixed:** `refusedTargets` runs `Promise.all` over the ids with no concurrency limit,
and each evaluation does its own `findByID`. A long named list produces that many concurrent reads.
D6 counted the evaluations but not their concurrency.

**2026-10-25 — `/sp-red-test` in audit mode** over the enqueue and access suites. Scaffolding deleted
and `git status` shown.

- Stubbing `refusedTargets`: **11 of the 19** pre-existing `handler.test.ts` cases went red, so they
  do reach the new path. Stubbing the whole permission module: 70 red across the package.
- **No toothless check found.** Everything that stayed green is green honestly: three files mock the
  unit themselves (their own seam is what they test), and `targetDocument.contract.test.ts` imports
  only types.
- **Finding, and it belongs to step 8:** those 11 cases now pass **because of the "no user means
  allowed" rule.** Their Payload doubles carry no collections and no document read, so a permission
  ask that reached Payload would throw — as `handler.identity.test.ts` did until it was isolated. When
  step 8 makes identity three-valued, expect those 11 to need a user.
