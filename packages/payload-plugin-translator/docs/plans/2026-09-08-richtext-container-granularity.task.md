# Task — container granularity, step 1: the two pure modules (#134)

- **Design:** [2026-09-08-richtext-container-granularity-design.md](./2026-09-08-richtext-container-granularity-design.md) — decisions D1–D22 are settled input, not up for re-litigation here
- **Issue:** [#134](https://github.com/focusreactive/payload-plugins/issues/134)
- **Date:** 2026-09-08 · **Risk:** low · **Scope:** build-sequence steps 1–2 only

---

## What this step builds

Two pure modules under `src/core/kernel/lexical/`, plus their contract tests. Nothing is
wired into the pipeline, and no existing file changes.

| Module | Owns |
| --- | --- |
| `collectInlineFragments.ts` | the Lexical side: find containers (D1), emit fragments with `node`/`top` (D17), glue whitespace nodes (D15), flag mark-shaped source text (D3) |
| `inlineMarks.ts` | the string side: serialize fragments to a marked string (D2, D4), parse a reply back, verify the mark set (D13), restore edge whitespace (D16) |

**Out of scope:** `RichContainerChunk` and the applicator branch, `RichContainerExpander`,
the transitional flag, provider capability, the prompt instruction, the retranslation pass
and the circuit breaker. Per D20, `collectTextNodes.ts`, `leafSourceText` and the whole
provenance path are not touched at all.

## Implementation decisions

| # | Decision | Rejected alternative | Constraint it cites |
| --- | --- | --- | --- |
| R1 | Corruption is a **return value**, not an exception: parsing yields a discriminated result carrying either fragments or a reason | Typed errors, as `parseAndValidateReply` throws | Corruption is one of two normal outcomes here — D7 makes per-node retranslation a routine path, not an anomaly. An exception on a routine path forces every caller into try/catch and is easy to swallow. Precedent for a value: `TranslationProvider.translate` returns `null` on failure |
| R2 | Two modules, split along "knows Lexical" vs "knows only strings" | One module covering both | `inlineMarks` has no reason to know what a node is, and mark-format tests would otherwise have to build trees. Matches the directory's habit: `guards`, `collectTextNodes`, `traverseLexicalTree`, `isEmptyRichText` are each one job |
| R3 | Edge-whitespace restoration (D16) lives in the parse step | A separate function, or doing it in the applicator | Parsing already holds both the source fragment texts and the translated ones; anywhere else has to be handed the same data twice. And the applicator must receive finished fragments — that is the core/provider split this design rests on |
| R4 | Neither module is added to `index.ts` yet | Export now for completeness | No caller exists until step 3 (`RichContainerExpander`). Tests import by direct path, as `collectTextNodes.test.ts` does |
| R5 | Own recursion for the container walk, not `traverseLexicalTree` | Reuse the existing traversal | It has no "found what I need, do not descend further" signal — only a full stop. A container must not have its own nested containers visited |

**Placement:** both files in `src/core/kernel/lexical/`, tests beside them as `*.test.ts`.

**New surface:** two functions and their result types. Callers: the tests now, and
`RichContainerExpander` at step 3 (named in the design's §5). No caller exists in the
codebase yet — justified because this is step 1 of an approved build sequence, not a
speculative seam.

**Written contract (what the signatures cannot say):** fragment order is document order ·
`top` may be a prepared copy rather than a node from the tree · whitespace-only nodes are
already glued into a neighbouring fragment and never appear as their own fragment · the
parser tolerates stray whitespace inside a mark · a corrupt reply returns a reason and
never partial fragments. This is what puts Phase 3 on the `/sp-red-test` path.

**Escalate to /sp-architect?** No. The design is already decided in the companion document;
this step is two leaf modules inside one existing directory.

## Acceptance criteria

| # | Criterion | How it is checked | Passes when |
|---|---|---|---|
| 1 | Serializing a container wraps every fragment, including unformatted ones (D4), and emits `<n/>` for a node with no text (D2) | `bunx vitest run src/core/kernel/lexical/inlineMarks.test.ts -t "serialize"` | exit 0, cases run |
| 2 | A reply whose marks come back reordered yields fragments in the reply's order | same file, `-t "reorder"` | exit 0 |
| 3 | Every verdict row of D13 holds: reorder / empty content / stray space inside a mark are valid; missing, unknown, repeated, nested, crossed, and no-text-at-all are corrupt with a reason | same file, `-t "verdict"` | exit 0 |
| 4 | An edge space the model trimmed is restored (D16) | same file, `-t "edge whitespace"` | exit 0 |
| 5 | Container detection follows D1: a paragraph with direct text is one; a list is not but each item is; a paragraph of only wrappers is not | `bunx vitest run src/core/kernel/lexical/collectInlineFragments.test.ts -t "container"` | exit 0 |
| 6 | A wrapper holding two leaves yields one copy per leaf, and the source tree is left unmutated (D17) | same file, `-t "wrapper"` | exit 0 |
| 7 | A whitespace-only node is glued onto the preceding fragment and never becomes its own mark (D15) | same file, `-t "whitespace"` | exit 0 |
| 8 | Source text containing a mark-shaped sequence is reported as unusable for container mode (D3) | same file, `-t "mark-shaped"` | exit 0 |
| 9 | No existing test breaks | `bun run test` | exit 0, ≥ 1359 tests pass, 0 failures |
| 10 | No new type errors | `bun run check-types` | exit 0 |
| 11 | No new lint findings over the baseline | `bun run lint` | ≤ 58 warnings, 0 errors |
| 12 | D20 holds — the per-node walk, the leaf text notion and the provenance path are untouched | `git diff --stat -- src/core/kernel/lexical/collectTextNodes.ts src/core/domain/content-projection src/core/domain/provenance src/server/modules/provenance` | empty diff |

### Pre-flight (run against the untouched tree, 2026-09-08)

| # | Polarity | Result now |
|---|---|---|
| 1–8 | must FAIL now | FAIL — the test files do not exist, vitest matches no file |
| 9 | must PASS now | PASS — 109 files, 1359 tests, all green |
| 10 | must PASS now | PASS — exit 0 |
| 11 | must PASS now | Baseline recorded: **58 warnings, 0 errors** across 452 files. Note: `bun run lint` exits 1 on warnings, so "lint is green" would have been a criterion that already fails — hence the delta form |
| 12 | must PASS now | PASS — empty diff |

## Risk notes

- The mark-set check is the piece everything else leans on. If it is wrong in the lenient
  direction, corrupt replies reach the tree; in the strict direction, every container
  falls back and the mode is pointless. It gets the fullest test coverage of the two modules.
- Copying a wrapper (D17) must not mutate the source node. A test asserts the original
  tree is unchanged after collection, because this is the failure that would silently
  corrupt a document once step 3 wires the applicator.
- The design's open question 2 (how often models drop empty marks) is answered by a live
  run *after* this step. If the answer is bad, D13 changes and the parser changes with it —
  which is why nothing above this layer is built yet.

## Human choices

| Decision | Chosen | Why |
| --- | --- | --- |
| D6's "unformatted" criterion | **Count leaves, do not read formatting** — a container with a single text leaf is skipped whatever its formatting | "Unformatted" cannot be decided without reading `format`, which this layer refuses to read. One leaf is uniform by construction, so the count answers the same question |
| Mixed nodes (own inline text plus a nested container) | Owner chose "skip and walk the children separately"; **implementation showed the case cannot be detected** — a link inside a paragraph has a direct text child too, so the check swallowed ordinary paragraphs. Dropped: the top-most node with a direct text child is the container, everything below is content | Telling a nested block from an inline wrapper needs a list of block types — the Lexical knowledge this design exists without. Real Lexical trees do not mix the two |
| Edge-whitespace restoration (D16) | Narrowed during implementation: applied **only when the reply has the same shape as the request** (same order, no empty mark) | Two contract tests failed on the original wording: restoring an edge after a reorder produced `une  voiture`, and after a merge a space trailing the paragraph. Order and merges change edges legitimately |

## Review log

### 2026-09-09 · sp-task step 1 (the two pure modules)

- **Contract tests, blind author.** 79 checks written from the contract against throwing stubs, by
  an agent with no implementation to read — none existed yet. Red run: 79 failed, 0 passed, 0
  module-resolution errors, every failure the stub's own error. Artifact: scratchpad `red-run.txt`.
- **Contract gaps the author surfaced: 23.** Twenty closed in the contract before implementing —
  serializer on empty input, reason precedence, `unclosed-mark` as its own reason, text outside a
  mark appended rather than dropped, `no-text` judged on non-blank content, edge restoration using
  the source's own characters, text-free fragment returned with text, tolerated liberties, mark
  numbers need not be contiguous, whitespace/empty leaves, root without children, copy depth.
  Three went to the owner (see `## Human choices`).
- **Anti-tautology pass caught two weak checks.** Both "the tree is not mutated" checks would have
  passed on an empty implementation, and the unclosed-mark check asserted only "not ok". All three
  strengthened before the implementation was written.
- **Green run:** 34/34 and 45/45. Two checks failed on first implementation and the *tests* were
  right: edge restoration after a reorder produced `une  voiture`, and after a merge a space
  trailing the paragraph. D16 was narrowed to same-shape replies only.
- **Mutations: 10, each red on exactly its own checks** — reply order, edge restoration,
  missing/repeated/nested verdicts, whitespace glue, wrapper copy, mark-shaped source, single leaf,
  and the backwards glue search. All reverted, suite green after each.
- **Fresh-eyes review (sp-review-iteration): one major finding, confirmed and fixed.**
  `glueWhitespace` searched only the last produced fragment, so whitespace after a line break was
  glued forwards instead of backwards and, at the end of a container, silently dropped. Two red
  tests first, then the fix, then a mutation proving they guard it. `inlineMarks` held up:
  no `lastIndex` leak, reason precedence matches the documented order.
- **Live model run (design's open question 2, now closed).** 99 containers ×
  French/German/Japanese × 4 models = 396 translations. Fallback rate ≈1% on gpt-4o and
  gpt-4o-mini (one `missing-mark` each), 0% on gpt-5.4-mini and gpt-5.5. Models do return the
  empty mark rather than omitting it. Total spend 17.2 ¢.
- **Gates:** `sp-diff-checks` clean (5 checks); `sp-lint-delta` no findings introduced; lint 58
  warnings / 0 errors — the recorded baseline; `check-types` clean; full suite 1442 passed.
- **All 12 acceptance criteria met** by their declared checks, none substituted.
- **Not in this step, by design:** the applicator branch, the expander, the transitional flag,
  provider capability, the prompt instruction, the retranslation pass, the circuit breaker.
