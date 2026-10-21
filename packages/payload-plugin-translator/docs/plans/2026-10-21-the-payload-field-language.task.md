# The Payload field language

First half of the two languages the plugin needs, written against the traversal kernel at
`src/core/traversal/`. Follows
[2026-10-20-the-traversal-kernel.task.md](./2026-10-20-the-traversal-kernel.task.md) and
[2026-10-20-entering-a-language.task.md](./2026-10-20-entering-a-language.task.md), whose
decisions stand. Nothing is wired: the pipeline still runs the old path.

The rich-text half is deferred — see *Deferred* at the end.

## Requirements / Task restatement

Teach the kernel to walk a Payload field schema, by implementing `Language` over the shapes
the plugin already understands. The language must select exactly what `FieldChunkCollector`
selects today and address each leaf with exactly the same `IdPath`, because that address is
what provenance receipts are stored under.

In scope: the language, and a differential check proving it agrees with today's collector.
Out of scope: wiring, rich text, the target-locale tree (see N3).

## What already exists — platform · installed · project · verdict

Nothing new is invented. The field vocabulary (`classifyField`, `tabScopes`,
`resolveBlockFields`), the selection rule (`isTranslatableLeaf`), emptiness (`isEmpty`) and
the address grammar (`makeIdPath`, `elementSegment`) are all in the package and under test.
This is a re-wiring into the `Language` shape.

## Decisions

**N1 — the language emits segments already rendered through the plugin's own grammar.**
The kernel's address is a flat `readonly (string | number)[]`, joined with `.`; the plugin's
is a branded string whose grammar escapes `\ # . :`, folds `blockType` into `id:blockType`,
and falls back to `#index`. A flat token cannot say which kind it is, so the language cannot
hand over raw names and expect the two to agree.
*Taken:* each segment the language emits is `makeIdPath([segment])` — the plugin's own
renderer, applied one segment at a time. Joining them with `.` then reproduces
`makeIdPath(all)` exactly, because that function is itself a per-segment render and a plain
join.
*Rejected:* re-implementing the grammar against the kernel's token type. Two renderers for
one format is how the stored addresses drift apart, and the drift is invisible until every
receipt stops matching.

**N2 — the language walks two trees, not three.** Today's collector carries `filteredData`
(which drives iteration and is mutated), `source` (read for the value) and `target` (read
only so the strategy can compare against an existing translation).
*Taken:* the cursor carries the working copy and the source. The target tree is **deferred**,
because the kernel has no slot for host policy — `filter` was removed from `CollectOptions`
when nothing used it — and because the step that would need it, `skip_existing`, is replaced
in the rewiring by a precomputed selection set. Under `OverwriteStrategy`, whose
`shouldTranslate` is `!isEmpty(sourceValue)` and never reads the target, the two paths are
exactly comparable.
*Consequence, stated rather than hidden:* this language cannot express `skip_existing`. That
is a clause of the inherited design that this step does not owe.

**N3 — the language does not seed the working copy.** Today's collector finishes by writing
each selected leaf's source value into the working copy, deep-cloning objects. That is
strategy semantics, not traversal, and the kernel design puts it in the pipeline wrapper.
*Taken:* left out. The differential check seeds both paths identically.

**Placement:** `src/languages/PayloadFields.language.ts`, `src/languages/index.ts`. The port
lives in `src/core/traversal/contract.ts`; implementations of a core port already live beside
it rather than in it — `TranslationProvider.interface.ts` in `core/domain/translation-providers/`,
its implementations at `src/translation-providers/`. The `.language.ts` role tag extends the
vocabulary the package's `CLAUDE.md` asks to extend.

**New surface:** one exported factory. The shape check fired on *two functions answering parts
of one question*: `selects` and `boundary` both take a node. `boundary` returns `null`
unconditionally here, so it claims nothing and `selects` owns every case — recorded so the
rich-text step cannot quietly inherit an unstated split.

**Written contract?** Yes, and it is the whole point: the addresses this language emits must
render identically to today's. AC2 is that contract.

**Escalate?** No. One package, no new seam, no dependency.

## Acceptance Criteria

From `packages/payload-plugin-translator`.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | The language selects exactly what the collector selects, **for a leaf whose stored value is a string** | differential check over the shapes `FieldChunkCollector.test.ts` already covers | the two text lists are equal, in order. The exception is pinned in `__tests__/PayloadFields.nonStringLeaf.test.ts`: where the stored value is not a string the collector emits a chunk and the language reports the leaf through `onSelectedWithoutText` instead, leaving the value untouched |
| AC2 | **Addresses are byte-identical** | the same check, comparing the kernel's joined segments against `chunk.idPath` | equal as strings, for every shape including ids, blockTypes and the no-id fallback |
| AC3 | A name containing a grammar character does not break the address | a field named `a.b` and an element id containing `:` | both paths produce the same escaped address |
| AC4 | Applying a translation through both paths leaves identical documents | seed both working copies, translate every target, deep-compare | `toEqual` |
| AC5 | **Unhappy path** — a context that is not this language's is refused | `enter` with a context carrying no field list | throws `CannotEnterLanguageError` naming this language |
| AC6 | **Unhappy path** — an element whose `blockType` names no block is skipped, not crashed | a blocks field with an unknown element | both paths skip it and agree |
| AC7 | `boundary` answers for every node | the language's own check | returns `null`, and `selects` is what decides |
| AC8 | Nothing is wired | `grep` over `src/index.ts` and the pipeline | no reference to `src/languages` |
| AC9 | The rest of the suite does not move | `bunx vitest run` | 169 files / 2202 checks plus only the new ones |
| AC10 | Clean types and lint | `bun run check-types`, `bunx oxlint .` | 0 errors; ≤45 warnings |

## Pre-flight

Against the untouched tree, 2026-10-21, branch `feat/translator-payload-fields-language` at
`6f540aa5`.

| AC | Result now | Kind |
|---|---|---|
| AC1–AC4, AC6, AC7 | `src/languages` does not exist | **change** — fail now |
| AC5 | the kernel's refusal path exists and is covered | **invariant** |
| AC8 | no reference exists | **invariant** |
| AC9 | 169 files / 2202 checks, green | **invariant** |
| AC10 | 0 type errors; 45 lint warnings, 0 errors | **invariant** |

## Risk notes

- **Risk: low to write, high to get wrong.** Nothing imports the language, so it cannot break
  the plugin today. But AC2 is the one that matters: an address that differs by one escaped
  character makes every stored receipt miss at the swap, and the symptom is "everything is
  stale", far from the cause.
- The differential check is only as good as the shapes it runs over. It borrows its case list
  from `FieldChunkCollector.test.ts` rather than inventing one, so the coverage it inherits is
  whatever that file already has.

## Human choices

- Run unattended, no questions, no commits — owner, 2026-10-21, going to sleep.
- **Forced at the gate, which the owner was not present for:** the scope split (field language
  now, rich text after a routing decision), N2's deferral of the target tree, and N3's
  deferral of seeding. Each is recorded above with what it costs. All three are reversible and
  none is visible outside this package.

## Deferred

The rich-text language. Reconnaissance established that block definitions cannot be reached
from `field.editor`: `lexicalEditor()` returns a bare closure and resolves its features lazily
inside. Three routes exist — call the provider with a real sanitized config, read the resolved
adapter at runtime, or rely on Payload mutating the original objects in place — and each
trades something different. Alongside them sits an unestablished question: whether an embedded
block's fields still carry a trustworthy `localized` once taken from the resolved editor, which
may rule routes out on its own. That choice is the owner's.

**An open question for the swap, not for this step.** The two-document checks here establish
that the language reads ids and text from the source document and writes into the working copy.
That claim is demonstrated under `OverwriteStrategy` only, because the differential harness drives
the collector with it. Whether the other strategy picks the same leaves is a question about the
pipeline's input, not about this language, and it belongs to the step that swaps them over.

## Decisions taken during execution

**X1 — `StepChild` goes back into the kernel's barrel.** It was removed in E14 of the kernel's
contract as surplus, on the measure that no consumer named it. This language names it: the two
helpers that build child descents are extracted from the `step` body and need the type for their
return. The measure has not changed — what changed is that a consumer now exists. Adding an export
is not a breaking change; removing one is, which is why the strict direction was the cheap one.

**X2 — the exclusion check in `selects` was redundant, and a mutation is what showed it.**
`selects` read `isTranslatableLeaf(field) && !isFieldExcludedFromTranslation(field)`, but
`isTranslatableLeaf` already ends in `!isFieldExcludedFromTranslation(field)`
(`translatableLeaf.ts:28-31`). Removing the second clause turned **nothing** red, which is what a
redundant guard looks like from the outside: the suite cannot see the difference because there is
none. `selects` is now `isTranslatableLeaf`, and the mutation was rewritten to break the rule
itself rather than a copy of half of it.

**X3 — a test that could not see the guard it was written for.** The check for "a field the
working copy filtered out is not collected" put the extra field in the source document but not in
the *schema*, so the walk never reached it and the presence guard was never exercised: removing the
guard turned nothing red. The field is now in the schema and absent only from the copy, which is
what a filtered working copy actually looks like.

**X4 — two checks legitimately survive a stubbed collector, and they are declared rather than
contorted.** "The comparison is not vacuous" runs only the old collector — its subject is the
oracle, not the kernel. "Declares no boundary" calls the language object directly and never reaches
the collector. Both are mutation-proven by their own breakages; neither has a subject a collector
stub could touch. Forty-three of the forty-five checks do go red.

**X5 — two of the comments this change wrote were false, and one of them had made a check false
too.** The audit checked every behavioural claim against the code:

- *"the copy being written does not carry it — which is what a filtered working copy looks like."*
  Not what one looks like. The only working copy in the pipeline comes from `DataReconciler`, whose
  leaf rule is `if (sourceValue === undefined) return undefined` — a field is dropped **only** when
  the source has none. The shape that check builds cannot arise. The comment is gone and the check
  is renamed to what it actually pins: the walk follows the working copy, whatever the source
  carries. The behaviour is right and worth keeping; the story about it was not.
- *"the target locale's own tree is not here."* Half true, and the misleading half mattered: the
  tree is not carried, but the reconciler seats existing target-locale values **inside** the
  working copy (`isEmpty(targetValue) ? sourceValue : targetValue`). The docblock now says what is
  true — `data` decides what is walked and receives every write, `source` supplies the text and the
  element ids — and states the consequence the old text left out: this language cannot express
  `skip_existing`, nor a refresh driven by the per-leaf change records, neither of which it carries.

**X6 — the address grammar had a second copy and the comment denied it.** The docblock claimed the
rendering was single-sourced; the *separator* was not. `makeIdPath`'s `SEP` is private, so the
checks joined with a hardcoded `"."`, and the addresses matched only because the two literals
happened to agree. `idPath.ts` now exports `renderSegment` and a `joinRendered`, `makeIdPath` is
written in terms of both, and the language and its checks use them — so the claim the comment made
is now structural and the comment is gone. The grammar keeps its own fourteen checks, so sharing
the joiner adds no unguarded surface.
*Also removed:* `String(makeIdPath([segment]))`, which minted fragments through the documented sole
constructor of a branded type and then stripped the brand.

## Review log

### 2026-10-21 — comment audit

6 blocks judged, every one: 4 deleted, 1 shortened, 1 answered by changing the code, plus 1 missing
one added. 17 comment lines over 462 of code going in; 4 lines left.

**Two carried false claims** (X5) — the class this audit's third check exists for, and the second
time in three runs that a false comment had also made a *check* false. One block was answered by
exporting the other half of the address grammar rather than by rewording it (X6).

### 2026-10-21 — code review

Five findings, four actionable.

**The address grammar had a second constructor** (major). Exporting `joinRendered` so the tests
could render the kernel's segments through the plugin's own grammar handed any caller a way to
build an `IdPath` out of unescaped strings — undoing the single-constructor guarantee `makeIdPath`
exists for. Closed by branding the intermediate: `renderSegment` returns a `RenderedSegment` and
`joinRendered` takes nothing else. A probe compiling `joinRendered(["a.b"])` now fails with two
"not assignable" errors.

**The comparison ran on a shape the pipeline never produces** (major). Every differential case fed
the walk `structuredClone(source)`. Production feeds it `DataReconciler.reconcile(source, target)`,
which strips ids from per-locale rows, seats existing translations in the leaves and passes unknown
elements through raw — so an edit that took an element's id or `blockType` from the working copy
would have passed every check here and broken every stored receipt at the swap. Five reconciler-driven
cases added, with three pins stating what the reconciler actually did to the copy. Mutating
`elementSegment(sourceItem, …)` to `elementSegment(item, …)` now turns the localized-array case red,
not only the hand-built two-document one.

**`.map(String)` hid the grammar** (minor). The address helper stringified whatever the kernel
emitted, so a segment that was never rendered would have compared equal by accident. Replaced with
a guarded conversion in `__tests__/addresses.ts` that throws on a non-string token.

**AC1 was unqualified** (minor). A leaf whose stored value is not a string diverges: the collector
emits a chunk, the language reports the leaf through `onSelectedWithoutText` and leaves the value
alone. Pinned in `__tests__/PayloadFields.nonStringLeaf.test.ts`, and AC1 now states the exception
rather than claiming agreement it does not have.

Writing that pin surfaced a defect in a check written an hour earlier: it called
`applyTranslations(targets, () => "translated")` — a function where the signature takes an array of
translations — so nothing was written and the check passed for the wrong reason. The type-checker
would have caught it; it was found by mutating the language and watching the check stay green. Fixed,
and all three checks in that file now discriminate.

### 2026-10-21 — acceptance walk

| AC | Verdict | Evidence |
|---|---|---|
| AC1 | met, with the exception stated in the row | `PayloadFields.differential.test.ts` — 11 shapes × "same text, in order", plus 5 reconciler-driven shapes; the non-string leaf pinned separately |
| AC2 | met | the same 16 shapes × "same addresses", rendered through `renderSegment`/`joinRendered` rather than `.map(String)` |
| AC3 | met | "names and ids carrying the characters the address grammar escapes" — text, addresses and document all equal |
| AC4 | met | the same 16 shapes × "same document after writing" |
| AC5 | met | `PayloadFields.refusesForeignContext.test.ts` — four refusals (no field list, a field list that is not a list, no document to write into, no document to read from) |
| AC6 | met | "a block element naming a type nobody declared", and "blocks where one element names no type at all" on the reconciled shape |
| AC7 | met | `PayloadFields.noRichTextCrossing.test.ts` (named `PayloadFields.richTextNotYet.test.ts` at the time) — declares no boundary, and the field is reported rather than dropped |
| AC8 | met | `grep` over `src/index.ts` and `src/core/translation-pipeline/` returns no reference to `src/languages` |
| AC9 | met | 174 files / 2268 checks, all passing; the baseline was 169 / 2202 before the kernel landed and 173 / 2247 at the start of this step |
| AC10 | met | `check-types` 0 errors; `oxlint .` 45 warnings, 0 errors — the baseline |

**Stub audit, re-run after the review.** Against a language that enters and then selects nothing,
60 of the 66 checks in `src/languages` go red. The six that stay green exercise something other
than this language: three state what `DataReconciler` did to the working copy, one states that the
old collector finds something in every shape, one states that the old collector hands over a
non-string leaf, and one states that the language declares no boundary. The seventh survivor from
the first audit — "the value survives the walk untouched" — was a claim about absence with no
anchor; it now asserts that the walk reached the leaf and reported it, and goes red on the stub.

Nothing is wired. The working tree is left uncommitted.
