# Field selection follows the drafts layer

> **Superseded on 2026-11-19** by `2026-11-19-what-the-locale-holds-decides-the-offer.task.md`.
> The offer is decided by what the target locale holds, not by the collection's draft layer; the
> refusal below survives as one of three conditions rather than as the whole rule.

Build step: 2026-11-18-the-server-reads-the-state.design.md #2

The design's placement and abstractions are adopted, not re-argued. This file records what the step
changed, the forks it met, and how each criterion was checked.

## Task restatement

A collection without a draft layer is written live, and Payload refuses a write that would leave a
required localized field empty — losing the whole write. So where a collection keeps no drafts the
admin stops offering a part of a document, and the enqueue route refuses a filtered run there
rather than trusting the screen that sent it.

## Requirements

- R1 (in) The admin is told, per managed collection, whether it keeps drafts.
- R2 (in) Where a collection keeps no drafts, neither screen offers a part of a document: the
  locale's tree opens whole rather than for picking, and the batch panel drops "only what is
  behind".
- R3 (in) The enqueue route refuses a run that carries any `filters` on such a collection, with a
  message naming what to send instead.
- R4 (out) How a run writes. Nothing about the mutator, the publish flag or validation changes.
- R5 (out) Reading the draft layer per request. The fact is settled at config time, where the
  collection configs already are.

## Decisions

**D1 — the drafts fact travels in the routes' config, not through `req.payload`.** The first
attempt asked `hasDraftsEnabled(req.payload.collections[slug].config)` inside the handler. That
reaches two levels into a framework object the handler otherwise never touches, and it broke five
unit tests whose request double has no `collections` — the tests were right: the handler's
dependencies are the ones it is constructed with. `EnqueueConfig` now carries
`keepsDrafts: ReadonlySet<CollectionSlug>`, built once in `documentTranslation()` beside
`availableCollections`, which already answers the neighbouring question. Rejected: a per-request
read, and a `hasDrafts` flag threaded through the enqueue body (the client would then be the one
asserting it, which is what R3 exists to stop).

**D2 — any filter is refused, including the `stale` rule.** A rule filter also writes part of a
document, so it carries the same risk as a list of addresses. Rejected: refusing only
`kind: "leaves"` — it would leave the batch panel's "only what is behind" as a live hole and make
the rule a silent exception to the rule.

**D3 — the batch panel is gated too, not only the document tree.** The design's sentence names the
document screen, but `collectionEnqueue` sends a `stale` rule from the bulk dashboard, so leaving it
alone would have shipped a screen whose button the server now refuses. The predicate lives in
`entities/translation/model/collectionOffer.ts` as `offersOnlyBehind`, beside the type both screens
now share.

**D4 — `TreeOffer` becomes `CollectionOffer` and moves to its own file.** Two different screens ask
it the same question — what this collection allows a run to ask for — and "tree" named only the
first of them. The type is one week old and unpublished, so the rename costs three call sites.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | The admin config declares the fact and a real boot fills it per collection | `grep -n hasDrafts src/types/wire/TranslateKitConfig.ts` + `bunx vitest run src/server/modules/plugin-config` | the field is declared; the boot case asserts `hasDrafts: true` only for the collection whose versions keep drafts |
| AC2 | R2 | A tracked locale of a live-write collection opens whole, not for picking | `bunx vitest run src/client/entities/translation/model/__tests__/localeRow.test.ts` | the case over the `live` offer expects `"whole"` for `up-to-date` and `behind` |
| AC3 | R2 | The batch panel hides "only what is behind" where the collection keeps no drafts | `bunx vitest run src/client/widgets/bulk-translation-dashboard` | the case queries the checkbox and finds none |
| AC4 | R3 | A filtered run on such a collection is refused and queues nothing | `bunx vitest run src/server/features/enqueue-translation` | 400, the message is `WHOLE_DOCUMENT_ONLY`, `enqueue` not called — for a leaves filter and for a rule filter |
| AC5 | R3 | The same collection still takes a whole-document run | same suite | 200 |
| AC6 | R5 — **negative** | The handler never reaches into the request's collection registry | `grep -c "req\.payload\.collections" src/server/features/enqueue-translation/handler.ts` | 0 |
| AC7 | R4 — **negative** | Nothing under the translation pipeline or the mutator is touched | `git diff --name-only` over the step | no file under `core/translation-pipeline/` or `server/modules/task-runner/` appears |
| AC8 | — | No new type errors | `bun run check-types` | 0 errors |
| AC9 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC10 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Pre-flight — each check run against the untouched tree (HEAD = 4b13dca3), 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — the field is not declared; the boot case asserts two facts without it | change |
| AC2 | **FAIL** — `treeModeOf(row, keepsRecords)` returns `"pick"` for every tracked row, drafts or not | change |
| AC3 | **FAIL** — the option is gated by `abilities.staleness` alone | change |
| AC4 | **FAIL** — a filtered run on any available collection is accepted | change |
| AC5 | **PASS** — a whole-document run was already accepted | invariant |
| AC6 | **PASS** — 0 | invariant |
| AC7 | **PASS** — nothing touched yet | invariant |
| AC8 | **PASS** — 0 errors | invariant |
| AC9 | **PASS** — 249 files, 2830 passed, 15 skipped | invariant |
| AC10 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | field declared; the new boot case passes, 15 tests in the file |
| AC2 | met | the `live` offer case passes |
| AC3 | met | 9 tests in the dashboard file, including the new one |
| AC4 | met | 58 tests in the enqueue suite, including the leaves and rule refusals |
| AC5 | met | same suite, the whole-document case |
| AC6 | met | 0 |
| AC7 | met | the step touches no file under `core/translation-pipeline/` or `server/modules/task-runner/` |
| AC8 | met | 0 errors |
| AC9 | met | 249 files passed, 2833 passed, 15 skipped — three more, the three new cases |
| AC10 | met | 26 warnings, 0 errors |

## Risk

**Low to the engine, visible to the user.** Nothing about how a run writes changes. What changes is
what the two screens offer and one new refusal, and the refusal can only reject a request the
updated screens no longer send. A host whose own code posts `filters` for a collection without
drafts now gets a 400 where it used to get a run that Payload might refuse anyway — which is the
point of the step.
