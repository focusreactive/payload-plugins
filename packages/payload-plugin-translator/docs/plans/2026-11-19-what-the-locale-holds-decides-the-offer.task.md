# What the locale holds decides the offer

Supersedes: 2026-11-19-field-selection-follows-the-drafts-layer.task.md (D1–D4), and with it
build step 2 of 2026-11-18-the-server-reads-the-state.design.md.

## Task restatement

One question decides whether a person may tick fields for a partial translation: **does the target
locale hold anything**. If it does, ticking is allowed; if it does not, the only offer is the whole
document. Who put the content there — a run or a person — and whether records of past runs are kept
do not enter into it.

The reason is single and narrow: a write must not fail Payload's validation. A locale that holds
content has already passed validation with its required fields filled, so a partial write merges
into it safely. A locale that holds nothing has not, so a partial write would leave required fields
empty and Payload would refuse the whole write.

## Requirements

- R1 (in) A target locale holding content offers the field picker; one holding nothing offers only
  the whole document. The row's history — translated by us, written by hand, filled with records
  switched off — makes no difference.
- R2 (in) The enqueue route refuses a run that names explicit field addresses when the target
  locale holds nothing **and** the collection keeps no drafts, deciding per target locale rather
  than per collection.
- R3 (in) The draft layer stops deciding what the admin offers, and the fact leaves the admin
  config. It stays on the server, where it is half of R2's condition.
- R4 (out) The bulk screen's "only what is behind". It sends a rule, not a list of addresses, and a
  rule is never refused — see D4. The option goes back to being gated by records alone.
- R5 (out) Corner cases, by the owner's decision: a field made required after a locale was saved,
  and a future rule that resolves to part of a document. Both end in a failed run with a visible
  error.
- R6 (out) The stub, the list route's own answer, and anything about drift.

## Decisions

**D1 — the row kind already answers the question, so `treeModeOf` loses its second argument.**
`localeRowOf` has folded the locale's content into the row before anyone asks about the tree:
`not-translated` is exactly "holds nothing", and `up-to-date`, `behind`, `written-by-hand` and
`translated` are exactly "holds something". Rejected: passing the content state beside the row,
which would make two values answer one question and let them disagree.

**D2 — a row with a live run stays shut.** `localeRowOf` lets a run outrank content, so a queued or
failed row cannot say what the locale holds. It offers no tree, as today — the run's own controls
are what that row is for. This is unchanged behaviour, named here because the rule above would
otherwise look incomplete.

**D3 — the picker opens with nothing ticked where there are no verdicts.** `initialSelection` seeds
from verdicts; an untracked locale has none. The caller passes an empty map, which the function
already reads as "nothing is known to be owed". Rejected: an optional `verdicts` prop — one caller,
and the empty map is the truthful value rather than an absence.

**D4a — the question is asked only of documents the caller may read.** The existence query runs
under the host's read rules, so a document hidden from the caller comes back from nothing and would
read as "this locale holds nothing". The check therefore runs after authorisation, over the
documents that survived it; a hidden id is reported beside the queued work as it always was. A
collection with no translatable path at all is skipped too: nothing could hold anything there, and
such a run writes nothing.

**D4 — three conditions, all of them, and a rule is never refused.** A write fails only when it is
validated and leaves a required localized field empty. That needs all three: no draft layer (a draft
save skips validation), a target locale holding nothing, and an explicit list of addresses. The
refusal therefore keeps the drafts test from the step it supersedes and adds the per-locale one
beside it.

A rule is never refused, and this is proven rather than assumed. In a collection without drafts a
locale holding a required field **cannot be cleared** — Payload refuses the write
(`apps/dev/.../clearing-a-locale.int.test.ts`) — so an empty locale there was never written, carries
no record, and the one rule that exists answers every leaf when no record is readable
(`Provenance.criterion.ts:36`): a whole-document write. In a collection with drafts a locale can be
cleared, so "empty with a record" exists — but the translation writes a draft there, and a draft is
not validated. Both branches are safe.

Rejected: refusing any narrowing, which would answer 400 to the bulk screen's "only what is behind"
on every page holding an untranslated locale — the ordinary case. Rejected: refusing by collection
alone, as the superseded step did, which forbids picking fields in a locale that is already full and
would pass validation.

**D5 — the field paths are resolved once per collection, through a lookup passed to the routes.**
Three places now need "which paths may hold translatable text in this collection": both reads and
the enqueue refusal. The schema cannot change while the process runs, so a lookup built at
composition time replaces the per-request walk the two read routes do today. Rejected: handing the
schema map to the enqueue feature as well and walking it per request — three walks of the same
unchanging schema on every request.

**D6 — the leaf sweep moves to the features' shared place, and the path grammar with it.**
`get-list-state` already imports it from `get-document-state`, which breaks the rule that no feature
imports a feature. The move to `_lib/` is what makes D5's lookup placeable at all — and the element
tokens (`#item`, `#<slug>`) move with the sweep that mints them, or the shared place would import a
feature in turn.

**D7 — the drafts fact leaves the admin config and stays on the server.** `CollectionFacts.hasDrafts`
exists only for the client rule being replaced, and the screen now asks one question that does not
include it; the field goes, which costs nothing outside this unmerged branch.
`EnqueueConfig.keepsDrafts` stays — D4 still reads it. Rejected: removing both, which would leave
the route unable to tell a draft write from a live one.

## Placement

| Responsibility | Where |
|---|---|
| which offer a row makes | `client/entities/translation/model/localeRow.ts` — `treeModeOf(row)` |
| the collection offer type and the bulk gate | deleted (`model/collectionOffer.ts`) |
| the field paths a locale may hold text in | moved to `server/features/_lib/schemaLeaves.ts`, with the memoized lookup beside it |
| the refusal's three conditions | `server/features/enqueue-translation/handler.ts`, after the targets resolve |
| building the lookup once | `composition/modules/documentTranslation.ts` |

**New surface:** one type, `TranslatablePaths = (collection: CollectionSlug) => readonly string[]`,
with three callers — the two read handlers (existing) and the enqueue handler (new). No other new
abstraction; two are deleted.

**Escalate?** No. The design this supersedes is the owner's own, re-decided by the owner today.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | `treeModeOf` answers `pick` for every content-bearing row and `whole` for the empty one, from the row alone | `bunx vitest run src/client/entities/translation/model/__tests__/localeRow.test.ts` | a case per row kind passes; the function takes one argument |
| AC2 | R1 | A hand-written locale's row renders the picker, with a Translate button counting ticked fields | `bunx vitest run src/client/widgets/translate-document` | the rendered row for an untracked locale shows checkboxes |
| AC3 | R1, D3 | That picker starts with nothing ticked | same suite | the button reads `Translate · 0` before anything is ticked |
| AC4 | R1 | An empty locale still offers the whole document only, with records kept or not | `bunx vitest run src/client/entities/translation/model/__tests__/localeRow.test.ts` | both cases answer `whole` |
| AC5 | R2 | Naming field addresses for a locale that holds nothing, on a collection without drafts, is refused 400 and nothing is queued | `bunx vitest run src/server/features/enqueue-translation` | the case passes and the runner is not called |
| AC6 | R2 | The same request aimed at a locale that holds content is queued — what the superseded step refused | same suite | 200, one task per asked locale |
| AC7 | R2 | The refusal is per locale: two targets, one holding content and one not, is refused and names the empty one | same suite | 400, the message names the locale |
| AC8 | R2 | The same request on a collection that keeps drafts is queued, since a draft write is not validated | same suite | 200 |
| AC8a | R4 | A rule aimed at a locale that holds nothing is queued, not refused | same suite | 200 |
| AC9 | R2 | The refusal holds through a real boot: a leaves filter into an untouched locale answers 400, and the same filter after the locale is written queues and translates only the named leaf | `cd apps/dev && bun run test:integration:sqlite src/integration/translator/partial-into-an-empty-locale.int.test.ts` | both cases pass; the untouched sibling field keeps its hand-written value |
| AC10 | R3 | The admin is no longer told about drafts | `grep -rn "hasDrafts" src/types/wire src/client` | no match |
| AC11 | R4 | The bulk screen offers "only what is behind" wherever records are kept, drafts or not | `bunx vitest run src/client/widgets/bulk-translation-dashboard` | the option is present for a collection without drafts, absent when records are off |
| AC12 | D6 — **negative** | No feature imports another feature | `grep -rn "features/get-document-state" src/server/features/get-list-state` | no match |
| AC13 | — | No new type errors | `bun run check-types` | 0 errors |
| AC14 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC15 | — | The sandbox suite stays green | `cd apps/dev && bun run test:integration:sqlite` | 0 failing |
| AC16 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Criteria pre-flight — run against the current working tree, 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — `treeModeOf(row, offer)` takes two arguments and answers `whole` for a tracked row without drafts | change |
| AC2 | **FAIL** — a `written-by-hand` row answers `null`: no tree at all | change |
| AC3 | **FAIL** — the picker cannot open there, so it cannot start empty | change |
| AC4 | **PASS in part** — `whole` with records kept, but `null` with records off | change |
| AC5 | **FAIL** — without drafts every narrowing is refused already, but for the collection's sake, not the locale's: the case passes for the wrong reason and cannot tell the new rule from the old | change |
| AC6 | **FAIL** — refused today on a collection without drafts | change |
| AC7 | **FAIL** — the refusal is per collection; locales are never consulted | change |
| AC8 | **PASS** — accepted today | invariant |
| AC8a | **FAIL** — a rule is refused on a collection without drafts | change |
| AC9 | **FAIL** — the sandbox file does not exist | change |
| AC10 | **FAIL** — one match in the wire type and three readers in the client | change |
| AC11 | **FAIL** — the option is hidden without drafts | change |
| AC12 | **FAIL** — one match: the list handler imports the document-state feature | change |
| AC13 | **PASS** — 0 errors | invariant |
| AC14 | **PASS** — 2949 passed, 15 skipped | invariant |
| AC15 | **PASS** — 68 files, 272 passed, 7 skipped | invariant |
| AC16 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | `treeModeOf(row)` takes one argument; a case per row kind passes |
| AC2 | met | the Dutch row, written by hand, renders checkboxes |
| AC3 | met | it reads `0 of 8 fields` before anything is ticked |
| AC4 | met | the empty locale answers `whole`, with no second argument to vary |
| AC5 | met | 400, the message names the locale, the runner is not called |
| AC6 | met | 200 — what the superseded step refused |
| AC7 | met | two targets, one empty: 400 naming only the empty one, asserted on the sentence rather than on an absence |
| AC7a | met | a document the caller may not read is reported beside the queued work, not read as an empty locale — proven by reverting the fix, which turns the 200 into a 400 |
| AC7b | met | a collection with nothing translatable is not refused |
| AC8 | met | 200 on a collection that keeps drafts |
| AC8a | met | 200 for a rule into an empty locale |
| AC9 | met | the sandbox file passes both cases: 400 into the untouched locale, and after a hand edit the named field is translated while the hand-written title stands |
| AC10 | met | no match in the wire type or the client |
| AC11 | met | the option is present for a collection with no drafts, absent when records are off |
| AC12 | met | no match |
| AC13 | met | 0 errors; 10/10 type-check tasks from the root |
| AC14 | met | 2951 passed, 15 skipped |
| AC15 | met | 274 passed, 7 skipped — two more than before, this change's own |
| AC16 | met | 26 warnings, 0 errors |

## Risk

**High.** The change touches a published type (`TranslateKitConfig`), the enqueue route's refusal —
the one surface a host calls directly — and five client call sites. It also widens what the admin
offers: locales that offered nothing now offer a partial run, and a partial run writes into content
a person may have written by hand. That is the intent, and the picker starting empty is what keeps
it deliberate.

The per-locale check adds one existence query per target locale, and only on a request that names
field addresses for a collection without drafts. From the document panel that is one query. A host
sending such a request with `select_all` pays one query per locale over every id in the collection —
the same order as the id read that request already does.

Nothing stored changes, and no migration follows.
