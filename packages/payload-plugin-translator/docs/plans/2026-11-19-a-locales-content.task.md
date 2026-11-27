# A locale's content

Build step: 2026-11-18-the-server-reads-the-state.design.md #5

The design's placement and abstractions are adopted, not re-argued. This file records what the step
changed, the forks it met, and how each criterion was checked.

## Task restatement

The admin shows each target locale as empty, written by hand, filled or tracked. The server has
never read a target locale outside a run. This step builds the rule and the one question it rests
on — does this locale hold anything translatable — and settles the two probes the design left open
about asking the database that question.

## Requirements

Requirement ids are the definition's, as the design's build sequence assigns them to this step.

- R6 (in) A locale's content is reported as one of `empty`, `untracked`, `filled` or `tracked`,
  deciding `empty` from the target's values and never from the presence of a receipt.
- Ra (in) The source locale of a read is resolved in one place, and the auto-translate hook reads
  it from there.
- Rb (out) The route. Nothing calls any of this yet.

## Decisions

**D1 — `exists` stands alone; a rich text saved empty counts as content.** The design left two
probes open. Both ran in the sandbox
(`apps/dev/src/integration/translator/exists-inside-a-list.int.test.ts`, seven cases): a path inside
a localized blocks field or array answers correctly, including a path only one of two block types
declares; a locale written only as a draft is seen when the query carries `draft: true`; and a rich
text saved with an empty editor state answers **as content**, because an empty editor state is a
value. The text check is **not** added. A locale holding only an empty editor reads `untracked` —
"written by hand" — so the row offers no run; the bulk screen still translates it. The alternative,
leaving rich text out of the question, would read a locale holding nothing but prose as `empty` and
offer to overwrite it. One wrong reading costs a person one unavailable button; the other costs
them their text.

**D2 — one sweep of the schema's leaves, two readers over it.** Asking which paths a value may sit
at is the same walk `excludedLabels` was doing. `schemaLeaves` now yields every leaf with its name
path, and both readers are filters over it. Rejected: a second sweep beside the first, which is how
two rules about the same leaves drift apart.

**D3 — the query path drops the element tokens.** The presentation index needs `#item` and
`#<slug>` to tell two blocks' fields apart; a stored field path has no shapes in it, so the query
spells `sections.heading` and two blocks declaring one name collapse to one path. That is what the
question needs: it asks whether anything is there, not which block it is in.

**D4 — the verdict-map method on the staleness service is not built.** The design lists it in this
step. The content rule takes the receipt and the source's current fingerprints and asks
`leafVerdicts` itself, so nothing needs the method yet; adding it now would be a method with no
caller, and the route in build step 8 is where it becomes clear whether the receipts arrive through
the service or through the store the design gives the module in step 7.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R6 | The four states are produced by the cases that should produce them | `bunx vitest run src/server/features/get-document-state` | one passing case per state |
| AC2 | R6 — **negative** | A locale holding no values reads `empty` even where a receipt says it was translated | same suite | the case passes; this is what regresses if a receipt is ever trusted for emptiness |
| AC3 | R6 | Emptiness is asked of the database per locale, over every translatable path, in that locale alone, drafts included | `bunx vitest run src/server/shared/payload/__tests__/localesHoldingContent.test.ts` | the query shape case passes; one query per locale |
| AC4 | R6 | The database answers that question for a path inside a block or an array, for a locale written only as a draft, and for a rich text saved empty | `cd apps/dev && bun run test:integration:sqlite src/integration/translator/exists-inside-a-list.int.test.ts` | 7 passing cases, and the rich-text case records the answer the decision rests on |
| AC5 | Ra | The source locale is one function, and the auto-translate hook calls it | `bunx vitest run src/core/domain/locales src/server/modules/auto-translate` | the four source-locale cases pass and the hook's own suite is unchanged and green |
| AC6 | — | No new type errors | `bun run check-types` | 0 errors |
| AC7 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC8 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Pre-flight — each check run against the untouched tree (HEAD = the document's shape), 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — no module answers what a locale holds | change |
| AC2 | **FAIL** — as above | change |
| AC3 | **FAIL** — nothing asks the database about a locale outside a run | change |
| AC4 | **FAIL** — the probe file does not exist; both questions are open in the design | change |
| AC5 | **FAIL** — the rule is inline in the hook, and `Locales` has no member for it | change |
| AC6 | **PASS** — 0 errors | invariant |
| AC7 | **PASS** — 254 files, 2871 passed, 15 skipped | invariant |
| AC8 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | seven cases, one per state and three on the record's reading |
| AC2 | met | the empty-with-a-receipt case passes |
| AC3 | met | the query shape, the per-locale count, the empty-paths short circuit and the read rule all pass |
| AC4 | met | 7 passing cases in the sandbox; the rich-text case answers "content", which D1 accepts |
| AC5 | met | 69 tests across the two folders pass, the hook's own suite among them |
| AC6 | met | 0 errors |
| AC7 | met | 2889 passed, 15 skipped — eighteen more |
| AC8 | met | 26 warnings, 0 errors |

## Risk

**Low while nothing calls it, with one judgement carried forward.** D1 decides how a locale holding
an empty editor reads, and that choice reaches a person only when the route lands. It is recorded
here rather than in a comment so the next reader can overturn it with the probe in front of them.
