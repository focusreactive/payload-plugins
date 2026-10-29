# Step 10 — pins and docs

Last step of `2026-10-25-asking-payload-everywhere.design.md`. Nothing about how the plugin asks
changes here. What changes is what a reader can find out without running it, and what a future
edit can break silently.

## What the design asked for, item by item

The design's step 10 reads: *"one pin per route for both asks, the field-route spend pin, `@since`
on the guard's `action`, the idempotency obligation in its docblock · covers: R1, R6"*. Plus the
debts steps 4, 6, 7, 8 and 9 each recorded as owed here.

The zero option is applied to every item: an item that is not owed is dropped with the measurement
that drops it, not built because a contract once named it.

| Item | Source | Verdict |
|---|---|---|
| one pin per route for the coarse ask | design | **build** — eight of nine routes are unpinned |
| one pin per route for the record ask | design | **drop** — three routes have no record ask to pin; the other six each already carry one |
| the field-route spend pin | design | **drop** — already exists |
| `@since` on the guard's `action` | design, step 4 | **build** |
| the idempotency obligation in the guard's docblock | design | **build** |
| `@since` on `TranslatorAction` | step 4 | **build** |
| `@since` on `assignmentsOf` | step 6 | **build** |
| `@since` on `JobAssignment` | step 6 | **drop** — not published |
| `@since` on `AuthorisedWork` / `AuthorisedHandle` | step 7 | **drop** — not published |
| `@since` on the three narrowed runner methods | step 7 | **drop** — a narrowed parameter is not an addition |
| integration pin: an unattributed job is refused | step 6 | **build** |
| release notes | steps 4, 6, 7, 8, 9 | **build** |
| proposed `README.md` text | step 4 | **report only** — the README is the owner's |

### The measurements behind the drops

- **The field-route spend pin exists.** `translate-field/__tests__/handler.access.test.ts:71` —
  *"pays nothing for a caller it refuses"*. Building a second one would pin the same fact twice.
- **`JobAssignment`, `AuthorisedWork`, `AuthorisedHandle` are not published.** `grep` of
  `src/index.ts` finds none of the three. The package rule scopes `@since` to *"anything re-exported
  from `src/index.ts`"*. A host implementing `TaskRunner` never names them — contextual typing
  covers the return position and the parameter positions — and a host *calling* the runner cannot
  mint them at all, which is the point of the brand. What a caller needs to know goes in the release
  note, which is a sentence rather than a tag.
- **A narrowed parameter is not an addition.** The package rule says `@since` *"applies to
  additions"*. `enqueue`, `cancel` and `run` already existed; their parameter types got narrower.
  That is a release-note fact.
- **Three routes have no record ask.** `get-document-status` and `get-collection-status` filter the
  ids they report through `visibleIds` rather than asking per document; the staleness **read** route
  asks nothing beyond the guard. Six routes ask per record and each already carries a
  `handler.access.test.ts`.

## The gap the coarse-ask pin closes

Nine routes pass a literal action to `withAccessCheck`. `accessIsNotOptional.pins.ts` pins that a
route *cannot be built* without a guard and an action, and that the action is a closed union. It
does not pin **which** literal each route passes.

So today a route can pass `"enqueue"` where it means `"cancel"`, and `check-types`, oxlint and the
whole suite stay green. A host whose guard answers per action would then be asked the wrong
question — the one failure this entire design exists to prevent, reachable by a one-word typo.

One route is pinned: `enqueue-translation/__tests__/route.test.ts:41` asserts
`expect.objectContaining({ action: "enqueue" })`. Eight are not.

## Acceptance Criteria

| # | Covers | Criterion | How it is checked (binding) |
|---|---|---|---|
| AC1 | R1 | Each of the nine routes, built through its own factory and invoked, asks the guard exactly once and passes **its own** action literal | a new pin file building all nine with a spy guard; one check per route |
| AC2 | R6 | Changing one route's literal turns exactly that route's check red and no other | the mutation, run once per direction |
| AC3 | R2 | A job the store recorded nobody for is refused by `POST /run/:id`, against the real queue runner | a case in `apps/dev`'s translator integration suite |
| AC4 | R6 | `TranslatorAction`, the guard's `action` field and `TaskRunner.assignmentsOf` each carry `@since 1.0.0` | `grep` over `src/` |
| AC5 | R6 | `AccessGuard.check`'s docblock states that the guard is asked once by the route **and** again by each admin widget offering the action, so an implementation that counts, bills or spends on being asked is wrong | read against the two widget call sites |
| AC6 | R6 | `docs/DEPRECATIONS.md` carries one dated section naming every host-visible change of steps 4 to 9, each sentence true of the code as committed | each sentence walked to the line it describes |
| AC7 | — | The baseline holds | real `turbo build` green; package suite and integration counted before and after |

## Decisions

- **`1.0.0` is the version**, determined deterministically rather than by a dry run: the branch
  already carries eight `@since 1.0.0` tags, written by earlier work on this same major, and the
  package has never tagged a prerelease number in a `@since`. A ninth tag saying something else
  would be the odd one out.
- **One pin file for all nine routes, not one per route.** The fact being pinned is a mapping —
  route to action — and a mapping is read in one place. Nine files each asserting one pair would
  make the gap (a route missing from the table) invisible, which is the failure the pin exists to
  catch.
- **The release notes go in `docs/DEPRECATIONS.md`**, in the dated-section form the file already
  uses for behaviour changes that remove no name (`## 2026-10-22`, `## 2026-10-24`, `## 2026-10-25`),
  not in the `### anchor` entry form, which is for a named symbol going away.

## Human choices

- The README text is proposed in the final report and not written. Standing rule: the README is the
  owner's.

## Owed to no one

This is the last step. Anything found here that is not built here is reported in the final report as
open, not recorded as owed to a step that does not exist.

## Criteria results

| # | Result | Evidence |
|---|---|---|
| AC1 | met | `src/server/shared/access/__tests__/everyRouteNamesItsAction.test.ts` — 18 checks over nine routes: one per route for the literal, one per route for *asked once*. The table is a `Record<TranslatorAction, …>`, so a tenth action with no route named for it fails `check-types` rather than slipping past unpinned |
| AC2 | met | `run-translation/route.ts`'s literal changed `"run"` → `"cancel"`: **1 failed, 18 passed**, the failure being `createRunRoute asks about "run"`. Restored by copy, not by `git checkout`. A second mutation — `withAccessCheck` asking twice — reddened the nine *asks once* checks and no others. A third — a tenth member added to `TranslatorAction` — failed `check-types` at the table, `TS2741` |
| AC3 | met | `access-control-queue.int.test.ts` — *"refuses to re-run a row that recorded nobody"*. Proven by deleting `if (!job.startedBy) return ServerResponse.forbidden();` from the run handler and rebuilding: that case alone failed, 3 passed |
| AC4 | met | `@since 1.0.0` on `TranslatorAction`, on the guard's `action` field, on `TaskRunner.assignmentsOf` |
| AC5 | met, reworded | the obligation is stated, but not in the words the criterion used — see *The comment audit moved AC5* below |
| AC6 | met | `docs/DEPRECATIONS.md`, section `## 2026-10-25 — one permission decision point`, six sub-sections, one per step from 4 to 9 |
| AC7 | met | see below |

### Numbers

Package suite **206 files / 2599 checks**, up from 205 / 2581 by exactly +1 file and +18 checks —
the pin file and nothing else. `check-types` 0. oxlint **43 warnings / 0 errors**, the baseline
unchanged. Real `turbo build` green, forced and uncached. Integration **226 passed / 8 skipped**, up
from 225 by exactly the one new case. `sp-diff-checks` clean, 5 checks. `sp-lint-delta` introduced
nothing.

### One claim corrected while writing

The release note first said an enqueue whose ids are **all** refused "queues nothing and says so
rather than answering an empty success". The handler answers `200` with `success: true`, `queued: 0`
and the ids under `refused` (`enqueue-translation/handler.ts:110-116`). The sentence now says that.

### A deviation from the design's wording

The design asked for *"one pin per route for both asks"*. Three of the nine routes have no
per-record ask to pin: `document-status` and `collection-status` filter the ids they report through
`visibleIds` rather than asking per document, and the staleness **read** route asks nothing beyond
the guard. The other six each already carry a `handler.access.test.ts` from steps 3, 5 and 6. So
what was built is one pin per route for the **coarse** ask, which is the half that had none.


## The comment audit

Run over the step's own diff by a reader who had not seen the code. Five blocks were handed over;
seven verdicts came back. Everything it found was applied.

| Block | Verdict | What was wrong |
|---|---|---|
| the integration case's three-line note | rewrite the code | the name said *"re-run"* for a row that had never run, and the reason belonged in the name |
| `@since` on `assignmentsOf` | keep | the surrounding prose was re-checked against both handlers and is accurate |
| the obligation on `check` | rewrite the comment | **it overstated and understated at once** — see below |
| the prose on the `action` field | rewrite the comment | it restated `TranslatorAction`'s own docblock, which a reader reaches by hovering the type |
| `@since` on `TranslatorAction` | keep | — |
| the docblock on the route table | rewrite the code | not on the list — written after the audit began. The constraint is already in the `Record` type; the name now carries the intent and the docblock is gone |
| `user: editor as never` | missing | my own new line, and against a standing rule. The cast was also unnecessary: `callEndpoint` already accepts that shape |

### The comment audit moved AC5

AC5 asked the docblock to say the guard is asked *"once by the route and again by each admin widget
offering the action"*. Measured, that is wrong in both directions:

- **Overstated.** Only `enqueue` is asked twice. The two widgets that ask at render both ask
  `"enqueue"`; `run`, `cancel`, `translate-field` and `dismiss-staleness` are asked once, at the
  endpoint, and the field control does not ask at render at all.
- **Understated.** The status actions are *polled*. `useDocumentTranslation.ts:49` and
  `useCollectionTranslationStatus.ts:46` both set a `refetchInterval`, so `document-status` and
  `collection-status` are asked over and over with nobody acting at all — a far stronger reason to
  keep the guard free of side effects than "more than once".

The docblock now says the measured thing. The criterion's own wording was the inaccurate one.

### Two smaller repairs in the same pass

- The new integration case asserted on `String(assignment?.handle)` without first checking an
  assignment came back. An empty answer would have sent the literal `"undefined"` and failed as a
  `404`, which says nothing about the real cause. It now asserts the assignment exists first, so the
  check fails for one reason.
- `user: editor as never` is now `user: editor`. The cast was copied from neighbouring integration
  tests; those are not a reason.

## The other three passes

- **Complexity** — nothing to judge: no production code path changed. Every production edit in this
  step is a comment. One counter did move, and deliberately: adding a tenth action now costs **three**
  edits instead of two — the union, the route, and the table in the pin — and the third is named by
  the compiler rather than left to memory. That is the pin working, not a cost to remove.
- **Abstraction** — nothing to judge: no boundary moved. `TranslatorAction`, `AccessGuard.check` and
  `TaskRunner.assignmentsOf` gained documentation, not surface. `RouteUnderTest` is local to one test
  file with one caller, which is a field, not a type anybody crosses.
- **Red test** — ran in full rather than in audit mode, because the checks are new: written from this
  contract's AC1–AC3 before the code they guard was touched, then proven by three mutations (a route
  literal, the asker asking twice, a tenth union member) and, for the integration case, by deleting
  the refusal from the run handler and rebuilding.

## Corrected 2026-10-26 — the `@since` on `assignmentsOf` rested on a measurement error

The table above reads `@since` on `assignmentsOf` → **build**, three rows above
`@since` on `JobAssignment` → **drop — not published**. Both sit on `TaskRunner`, so only one of
them can be right.

The verdicts were split because I grepped `\bTaskRunner\b` in `src/index.ts`, found a match, and
read it as an export. **It is a line of prose inside a comment.** `src/index.ts` re-exports
`TaskRunnerProvider`; `TaskRunner` is reachable only structurally, as the return type of
`create(payload, context)`, and the package's `exports` map carries only `.` and `./client/*`. So
the package rule — `@since` on *"anything re-exported from `src/index.ts`"* — never applied to a
member of `TaskRunner`, and the "not published" reasoning recorded for `JobAssignment` was the
correct reading for both.

**The tag is dropped.** `assignmentsOf` carries no `@since`. What a host actually needs to know — it
is now a **required** member, so an existing runner stops compiling — is a release-note fact and
lives in `DEPRECATIONS.md`, under *one permission decision point*. AC4 above is amended to cover
`TranslatorAction` and the guard's `action` field only.

Nothing else in this step moves: the eight `@since 1.0.0` tags on genuinely published API stand, and
the reason given for the version — eight tags already on this branch — is unaffected.
