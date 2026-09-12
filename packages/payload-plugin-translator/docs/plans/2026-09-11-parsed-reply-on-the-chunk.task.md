# Move the parsed reply onto the chunk

**Date:** 2026-09-11 · **PR:** #139 (fourth commit) · **Risk:** low
**Behaviour must not change** — 1488 tests, same count, all green.

## Requirements / Task restatement

`TranslationStage` parses each container's reply into marks and puts the result in
`PipelineContext.containerFragments`, a `Record<number, ParsedMark[]>`. `TranslationMutator.apply`
takes that map as a third parameter and joins it to each chunk by `chunk.index`.

Put the parsed reply on `RichContainerChunk` instead. The context field and the third parameter go.

## Decisions

**D1 — the parsed reply lives on the chunk.** Rejected: the status quo. The constraint is in
`types/TextChunk.ts` itself: a chunk already carries every write handle the mutator needs —
`dataRef`/`key` (`:15-17`), `nodeRef` (`:31`), `containerRef` (`:46`), and `fragments[].node`/`.top`.
"Where to write" is already the chunk's job; the parsed reply is "what to write" for the same
write, and keeping it elsewhere forces a lookup by index to put the two halves back together.

Second constraint, decisive: `chunk.index` equals the chunk's position in `textChunks` —
`TextChunkExpander.expand` runs one dense counter across all fields (`:27,34,37`), and every
expander increments by one per emitted chunk. So `containerFragments` is a sparse column over an
array that is already indexed by the same number: a structure whose only job is re-association.

Third: the next change (the untranslated report) derives a **second** per-chunk value from the same
parse — the failure reason. Under the status quo that becomes a fifth index-keyed column in the
context; on the chunk it is one more field and the report is a walk over `textChunks`.

**D2 — the field is named `reply`, not `fragments` or anything containing it.**
`chunk.fragments` already exists and means something different: fragments collected from the tree
*before* sending, carrying live node references. The parsed reply is pure data that came *back*.
One word for both is what made the distinction unreadable in review.

**D3 — a stage now writes into a chunk, and that is a deliberate break.**
No pipeline stage writes into a chunk today (verified by grep over `stages/`): chunks are authored
by stage 3 and read by stage 5, and a stage's return value describes everything it did. After this
change `TranslationStage` fills in a field on chunks stage 3 created, so its return understates it.
Accepted by the owner: the cost of the rule is a fourth index-keyed column now and a fifth next.
Named here so a later reviewer does not read it as an oversight.

**D4 — `parseContainerReplies` stops returning anything.** It writes onto the chunks and returns
`void`, which removes the state it had no use for: `undefined` when there were no containers versus
an empty map when none parsed — two spellings of "nothing here" that no consumer could tell apart.

**Placement:** `types/TextChunk.ts` (the field), `Translation.stage.ts` (the write),
`TranslationMutator.ts` + `.stage.ts` (the read), `types/PipelineContext.ts` (the removal).

**New surface:** none. An optional field on a type that `src/index.ts` does not export.

**Written contract?** One clause the signature cannot state: **an absent `reply` means the
container keeps its source text** — it is the same outcome for "no reply came back" and "the reply
could not be parsed", and the mutator must not distinguish them. Recorded in the field's docblock.
Not enough to fire a blind-authoring run: this is a refactor of behaviour already covered, not a
new contract others will implement.

**Escalate?** No. One module, no new seam, no data-model change.

## Acceptance Criteria

| # | Criterion | How it is checked | Passes when |
|---|---|---|---|
| 1 | `containerFragments` exists nowhere | `grep -rn containerFragments src/` | no matches |
| 2 | `apply` takes two parameters | `bun run check-types` after a temporary third argument at the call site | the extra argument is a type error |
| 3 | The container write path has a direct unit test | `bunx vitest run .../TranslationMutator.test.ts -t "container"` | exit 0, the cases run |
| 4 | Behaviour unchanged | `bunx vitest run` | **1488 + the new cases**, 0 failed |
| 5 | The 13 container tests were not edited to fit | `git diff -- .../containerMode.test.ts` | empty |
| 6 | No new type errors | `bun run check-types` | clean |
| 7 | No new lint findings | `bun run lint` | 58 warnings, 0 errors |
| 8 | The declaration build still passes | `bunx turbo run build --filter=...` | 1 successful |
| 9 | Unhappy path: a container whose reply did not parse keeps its source text | the new unit test, a chunk with no `reply` | the node's text is untouched |

## Pre-flight (against the untouched tree, 2026-09-11)

| # | Result | Class |
|---|---|---|
| 1 | 4 files mention `containerFragments` | change — fails now, correct |
| 2 | the third parameter is declared | change — fails now, correct |
| 3 | `grep -c richContainer` in the mutator's test → **0** | change — fails now, correct |
| 4 | 113 files, 1488 passed | invariant — passes now |
| 6 | clean | invariant — passes now |
| 7 | 58 warnings, 0 errors | invariant — passes now |

## Risk notes

- The only real risk is a silent behaviour change, and the net is 23 tests over the two files that
  matter (13 end-to-end container cases, 10 on the mutator). Criterion 5 is what stops the net
  being adjusted to fit the change.
- The container write path had no unit test before this change. That is why criterion 3 exists:
  without it the refactor would rest entirely on end-to-end coverage.

## Human choices

- **2026-09-11 — the owner proposed this design and instructed the run**: *"Если тестами покрыто -
  тогда запускай через /sp-task, потом подлей изменения в ветку"*. The Phase 2 gate is therefore
  not re-asked: re-confirming the owner's own proposal would be a pause with no decision in it.
- **2026-09-11 — breaking the "no stage writes a chunk" habit is accepted** (D3), on the grounds
  that the rule costs a fourth index-keyed column now and a fifth in the next change.

## Review log

| Date | Pass | Outcome |
|---|---|---|
| 2026-09-11 | implementation self-verification | criteria 1-9 met by their declared checks; `sp-diff-checks` clean (5 checks); `sp-lint-delta` reports no introduced findings |
| 2026-09-11 | fresh eyes on the diff | **no findings**. Confirmed no behaviour difference (an empty `ParsedMark[]` is truthy under both the old lookup and the new field read, and `undefined` propagates identically); no aliasing (chunks are rebuilt on every `execute()`); nothing left behind by the removal |

### Mutations

| Mutation | Went red |
|---|---|
| the translation stage stops writing `chunk.reply` | 6 cases, incl. three end-to-end container tests |
| apply an empty reply when none was parsed | the new `leaves the container untouched when no reply was parsed`, plus the end-to-end corrupt-reply case |

**One correction worth recording.** The first attempt at the second mutation stayed green, and I
briefly read that as a coverage gap. It was a bad mutation: it wrote each fragment's own text back
over itself, so nothing changed and there was nothing for a test to catch. Replaced with one that
applies an empty reply, which discriminates.

**One honest limit.** Of the three new unit tests, a no-op implementation would fail the first two;
the third — absence of a reply leaves the container alone — is satisfied by doing nothing, which is
also what it asserts. Its guard value comes from the mutation above, not from the test in isolation.
