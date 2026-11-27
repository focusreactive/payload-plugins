# The document's shape

Build step: 2026-11-18-the-server-reads-the-state.design.md #4

The design's placement and abstractions are adopted, not re-argued. This file records what the step
changed, the forks it met, and how each criterion was checked.

## Task restatement

The admin shows a saved document's translatable fields as a labelled, nested tree, and names the
fields that opted out of translation. Nothing on the server produces either today. This step builds
both, and nothing else: no route, no locale content, no run state.

## Requirements

Requirement ids are the definition's, as the design's build sequence assigns them to this step.

- R3 (in) The server produces a labelled, nested tree of a saved document's translatable fields:
  groups, leaves with `required`, and a block list localized as a whole as one `whole-list` node.
- R4 (in) The server produces the labels of the fields excluded from translation.
- Ra (out) The route. Nothing is registered, and no handler reads a request.
- Rb (out) A locale's content and the verdicts. The tree is the shape all locales share.

## Decisions

**D1 — exclusion is read off the pre-sanitize schema, not the label index.** The design puts the
labels and `excluded` on the same reader. They cannot share one: the engine translates a leaf only
when the leaf itself declares `localized`, and Payload's sanitizer **deletes** a nested `localized`
under a localized ancestor. A sweep over the sanitized config would therefore have to guess which
leaves declared it, and would name fields no run was ever going to translate. `excludedLabels` walks
the pre-sanitize schema — where the flag is intact and the rule is the engine's own
`isTranslatableLeaf` — and asks the label index only for the label. Rejected: carrying an inherited
`localizedAbove` through the sanitized walk, which is the mechanism the design rejected for the tree
and is no better here.

**D2 — one path grammar, shared by both readers.** The label index is keyed by the name path with
an element token: `#item` for an array element, `#<blockSlug>` for a block element. Without the
token two blocks of one list declaring the same leaf name would share an entry and one would show
the other's label. The token is exported from the index, so the tree walk and the exclusion sweep
spell it the same way. Rejected: keying by field name alone, and a separate map per block slug —
the first collides, the second needs a second lookup rule at every caller.

**D3 — a list element is numbered within its list.** Two elements of one shape are otherwise two
nodes with one label, and the person cannot tell which "Hero" they are ticking. The number is the
position at read time, not an identity; the address under it is the element's id, so reordering
moves the label and not the address.

**D4 — each file is named for what it exports.** The design's working names (`fieldLabels.ts`,
`tree.ts`) became `collectionPresentation.ts`, `documentTree.ts` and `excludedLabels.ts` once D1
split the third reader out. The package's rule is that a camelCase file holds the function it is
named for.

**D5 — a `blocks` field's definitions are resolved where each reader stands.** In the sanitized
config a `blockReferences` field still carries slugs, so the index resolves them against the root
`blocks` list it is handed. In the pre-sanitize schema `projectFieldsToFieldLike` has already
resolved them, and the sweep guards against the cycle that projection can produce by refusing to
re-enter a block slug it is already inside.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R3 | The tree names its groups and leaves with the labels the config gives, and marks a required leaf | `bunx vitest run src/server/features/get-document-state` | the label, nesting and `required` cases pass |
| AC2 | R3 | A list localized as a whole is one `whole-list` node carrying its leaf addresses, not a group of per-element leaves | same suite | the whole-list case passes |
| AC3 | R3 | The tree holds exactly what the access-enforced read produced: a leaf with no source text, or absent from the document, has no node, and a container left empty is dropped | same suite | the three pruning cases pass |
| AC4 | R4 | A field carrying the exclusion flag appears in `excluded` by its label and in no tree node, and a field no run would translate anyway appears in neither | same suite | the exclusion cases pass |
| AC5 | R3 | The tree's addresses are exactly the keys the content projection produces, over a shape with a nested group, a referenced blocks field and a localized array | same suite, plus one mutation: drop the empty-leaf prune and re-run | equal in the normal run; the mutated run fails with the extra address |
| AC6 | — | No new type errors | `bun run check-types` | 0 errors |
| AC7 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC8 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Pre-flight — each check run against the untouched tree (HEAD = 7cd4ca8b), 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — no module produces a tree; every producer of `TreeNode` is the stub or the client | change |
| AC2 | **FAIL** — as above | change |
| AC3 | **FAIL** — as above | change |
| AC4 | **FAIL** — no label is ever collected for an excluded field | change |
| AC5 | **FAIL** — there are no tree addresses to compare | change |
| AC6 | **PASS** — 0 errors | invariant |
| AC7 | **PASS** — 250 files, 2846 passed, 15 skipped | invariant |
| AC8 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | the label, group-nesting and required cases pass |
| AC2 | met | the whole-list case passes, addresses in document order |
| AC3 | met | the empty-text, absent-field and empty-group cases pass |
| AC4 | met | four exclusion cases pass, including the nested and the non-translatable ones |
| AC5 | met | equal over the fixture; with the prune removed the run failed on the extra address |
| AC6 | met | 0 errors |
| AC7 | met | 254 files passed, 2871 passed, 15 skipped — twenty-five more, this step's cases |
| AC8 | met | 26 warnings, 0 errors |

## Risk

**Low while nothing calls it.** The three modules are pure and unreferenced outside their tests
until the route lands. The risk they carry forward is cosmetic — a label that differs from Payload's
own admin for a `RowLabel` function or an unlabelled array — and one structural claim, the address
parity, which is the step's own guard.
