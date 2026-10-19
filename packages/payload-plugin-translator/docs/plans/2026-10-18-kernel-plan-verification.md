# Research — verify the kernel-extraction plan against the code

**Date:** 2026-10-18
**Kind:** verification research. No code changed, no plan edited, no issue opened.
Source: 2026-08-21-translation-mechanism-kernel-extraction.md

(1020 lines, status *designed, implementation pending approval*, written 2026-08-21)

---

## Problem statement

The kernel-extraction plan was written on 2026-08-21 and has not been implemented. **87 commits
landed in the package since**, including the per-leaf fingerprint work and the inline-marks work.
A plan whose measurements have rotted is worse than no plan: its phases are sized against a
codebase that no longer exists, and its citations send a reader to lines that now hold something
else. This research establishes, claim by claim, where the document and the code have parted.

**Headline:** nothing from the plan has been built — no `TranslationTarget`,
`collectTranslationTargets`, `Language`, `Crossing` or `onUnhandled` exists anywhere in `src`. The
sequence is intact and still executable. What has rotted is the evidence, in three places that
matter, and one of them inverts a premise the design rests on.

---

## Phase 2 — codebase map

Files the verification touched, as the next skill will need them:

| Area | Path |
|---|---|
| Traversal engine | `src/core/kernel/field-traversal/` — `kernel.ts` (176 l.), `walkFields.ts` |
| Rich-text descent | `src/core/kernel/lexical/` — `traverseLexicalTree.ts`, `collectTextNodes.ts`, `collectInlineFragments.ts`, `inlineMarks.ts` |
| Leaf selection | `src/core/domain/content-projection/translatableLeaf.ts` (54 l.) |
| Projection | `src/core/domain/content-projection/contentProjector.ts` (97 l.) |
| Pipeline contract | `src/core/translation-pipeline/types/` — `TextChunk.ts` (78 l.), `FieldChunk.ts`, `PipelineContext.ts` |
| Pipeline stages | `src/core/translation-pipeline/stages/` — collector (162 l.), expander (45 l.), translation, applicator (69 l.), reconciler (151 l.) |
| Strategies | `src/core/translation-pipeline/strategies/` — `SkipExisting.strategy.ts` (23 l.), `Overwrite.strategy.ts` |
| The worker | `src/server/features/translate-document/handler.ts` (250 l.) |
| Boundary guard | `src/core/no-payload-boundary.test.ts` |
| Cited CMS example | `apps/cms/src/blocks/CtaBanner/` — `inlineConfig.ts`, `fields.ts` |

**Prior art:** the plan itself, plus the three documents it follows
(`2026-07-31-core-agnosticism-options-and-value.md`,
`2026-07-31-core-portability-storyblok-research.md`, `2026-07-17-core-layering-redesign.md`). No
competing definition of this work exists.

---

## Verification — claims

Grouped by verdict. `file:line` is the evidence as it stands today.

### Claims that have become false

| # | Plan says | Verdict | Evidence |
|---|---|---|---|
| C1 | §2: write-back is *"a two-member discriminated union"*, with a quoted `TextChunk = PlainTextChunk \| RichTextChunk` and a two-branch mutator | **false** | `TextChunk.ts:1-78` declares **three** members — `PlainTextChunk`, `RichTextChunk`, `RichContainerChunk`. `TranslationMutator.ts:17-32` carries a whole `applyContainer` function that did not exist, and `apply` branches three ways |
| C2 | §1: *"The provider boundary … is already neutral: `Record<number,string>` in, `Record<number,string>` out, no knowledge of Payload or of any format"* | **false, twice over** | `Translation.stage.ts:43-48` passes a fourth argument built by `requestOptions` (`:21-28`). It carries `document: DocumentRef` — a `{ collection, id }` pair, which is Payload vocabulary — and `inlineMarks`, which the stage derives by testing `ctx.textChunks.some(isRichContainerChunk)`. Format knowledge now lives inside the stage the plan calls format-free |
| C3 | ADR-3: *"Today the pipeline's chunks have no location; only the projector computes `idPath`"* | **false** | `FieldChunk.ts` declares `idPath: IdPath`, computed in `FieldChunkCollector.ts:122` and used for the strategy lookup at `:128`. `PipelineResult.translatedPaths` is built from those paths |

C1 deserves a note rather than only a correction. The plan's own argument was that *"every new
format needs a new union member **and** a new branch in the mutator"*. Between writing and now,
exactly that happened — container-mode rich text arrived as a third member with a third branch.
**The argument is better evidenced than when it was written; only its evidence is stale.**

C3 matters to sizing: half of what ADR-3 proposes — carrying a location on every unit — already
exists for field chunks. Text chunks still have none.

### Claims that have weakened but are not wrong

| # | Plan says | Verdict | Evidence |
|---|---|---|---|
| C4 | §1: *"the method is already ~4/5 extracted"* | **weakened** | Link 5 grew a third member (C1) and link 3's neighbour stopped being neutral (C2). The fraction was measured against a smaller, cleaner surface |
| C5 | §6: phase 1 sized **S** — *"`TextChunk` union → `TranslationTarget` with `write()`; `TranslationMutator` collapses"* | **undersized** | Collapsing two members that both assign a string is small. The third member writes by **rebuilding a node array** (`TranslationMutator.ts:19-32`) and carries `fragments` + `reply` instead of `text`, so it does not fit the `{ text, write }` shape without a decision the plan has not taken |

### Claims that hold

| # | Plan says | Verdict | Evidence |
|---|---|---|---|
| C6 | §3: `DataReconciler` and `sharedRow` are Payload storage policy and sit where stated | **holds** | `DataReconciler.ts:111-116` — `blockType` copy and the `cursor.sharedRow && cursor.source.id != null` keep/strip |
| C7 | §3: *"`matchElementById` … today it sits in `kernel/` where mechanism lives"* | **holds** | `kernel.ts:164-176`, pairing on `id` plus `blockType` when `isBlocks` |
| C8 | §3: strategies are domain policy living in `translation-pipeline/strategies` | **holds today, scheduled to vanish** | Both files present. The owner has since decided the port and both implementations are deleted — see *Decisions taken since* |
| C9 | §1.1: `classifyField` has no notion of `richText`; every text-ish field lands in `leaf` | **holds** | `kernel.ts:64-83` returns `transparent` / `group` / `array` / `blocks` / `leaf` only |
| C10 | §5.1: the embedded-block defect is unfixed and is phase 5's driver | **holds** | `traverseLexicalTree.ts:17-22` descends only through `hasChildren`. A Payload inline block keeps its content under `fields`, so it is never visited. No `BlocksFeature` / `blockNode` / `inlineBlock` handling exists anywhere in `core/kernel/lexical/` |
| C11 | §2: three parallel structures (`index`, `textMap`, `translations`) exist only to re-associate | **holds** | `PipelineContext.ts` carries `textChunks`, `textMap`, `translations`; every chunk still carries `index` |
| C12 | §6 phase 0: a parity test between `isTranslatableFieldType` and `isTranslatableField` is missing | **holds — still missing** | `isTranslatableFieldType` appears in exactly one file, its own definition (`translatableLeaf.ts:17-19`). No test references it. `isTranslatableField` is at `field-guards.ts:11-13` |
| C13 | §4.5: schema authors already write the inline-block signal in `apps/cms` | **holds, name drifted** | The plan says `CtaBannerInlineBlock`; the directory is `apps/cms/src/blocks/CtaBanner/` with `inlineConfig.ts` |

---

## Verification — citations

Seventeen citations carry line numbers. Four no longer point at what the sentence describes.

### Broken — the line now holds something else

| Citation | Cited for | What is there now |
|---|---|---|
| `translate-document/handler.ts:52` | *"captures the fingerprint before `translateContent` runs"* | The **constructor's** parameter list (`inlineMarks = false`). The fingerprint capture moved to `:121`; the file grew to 250 lines |
| `stages/translation-applicator/TranslationMutator.ts:18-27` | the two-branch write-back | The body of `applyContainer`, a function added after the plan was written. The branching `apply` is further down |
| `types/TextChunk.ts:23-40` and `:24`, `:50` | the union, and *"the actual plain-vs-rich split"* | `:23-40` covers `RichTextChunk` alone; `:50` lands inside `RichContainerChunk.reply`'s docblock |
| `FieldChunkCollector.ts:137-139` | *"seed the copy with the source value before translating"* | The `chunks.push({ schema, dataRef, key, idPath })` literal. The seeding — `selected.push({ dataRef, key, sourceValue })` — is at `:131` |

### Drifted — off by a few lines, claim still correct

`kernel.ts:66-90` (`classifyField` now ends ~`:83`) · `kernel.ts:161-175` (`matchElementById` at
`:164-176`) · `DataReconciler.ts:107,:112` (the keep/strip logic at `:111-116`) ·
`SkipExisting.strategy.ts:19-21` (the Lexical sniff at `:17-19`; the file is 23 lines).

### Accurate

`translatableLeaf.ts:17`, `:18`, `:28-31`, `:42` · `TextChunkExpander.ts:24-44` ·
`RichTextExpander.ts:14` · `field-guards.ts:12` · `collectTextNodes.ts:8-23` ·
`contentProjector.ts:21-24` · `TextChunk.ts:1` (still a Lexical import, though a different one).

---

## Verification — the package boundary table (§4.6)

The table is a two-column list, and three of its rows carve an exception out of a glob stated in
another row, without marking the glob:

| Glob said to move | Exception stated elsewhere |
|---|---|
| `src/core/kernel/**` | `core/kernel/lexical` **stays** with the Payload rich-text language (row 4) |
| `src/core/translation-pipeline/**` *(primitive, stages, strategies)* | `DataReconciler` **stays** — and it lives at `core/translation-pipeline/stages/data-reconciler/` |
| same row, *"strategies"* | after the owner's decision there will be no strategies to move |

A reader applying the globs literally moves two things the plan means to keep. This is a precision
defect in the document, not drift in the code.

---

## Decisions taken since the plan was written

Three owner decisions bear on it, none of which the document reflects:

1. **Open question 5 is closed.** Building the system prompt stays where it is. The port never
   carried it: prompt assembly lives in the adapter layer and `systemPrompt` is an option on each
   provider's own factory, so a provider that cannot use a prompt simply has no such option.
   Nothing to change.
2. **Strategies are deleted, not relocated.** The port and both implementations go; the pipeline
   takes one input — a set of leaf addresses — and each caller computes its own. Five places lean
   on strategies existing: §3's non-goals bullet, the §4.3 consumer table, the `Language.isEmpty`
   docblock, the §4.6 boundary row, and §4.2's `select?` comment (*"the translation strategy,
   mainly"*).
   **Note:** the plan anticipated this. §3 already says strategies *"reach the primitive through
   the selection port"*. The decision finishes that thought rather than contradicting it.
3. **A new extension seam opens to hosts only after phase 6.** Nothing in the plan obstructs this.
   §6 already states phase 6 breaks the package API and that the package must not be publicised
   before it lands. The one thing to carry forward: if the phase-4 fallback is taken (*"do phase 5
   in-plugin and split afterwards"*), phase 6 must still precede the seam.

---

## Requirements

- R1 (in) Correct §2: the union has three members, not two, and the quoted code no longer matches
  the file.
  > is expressed as a two-member discriminated union, with a Lexical type
- R2 (in) Correct §1: the provider boundary is no longer format-free or Payload-free.
  > "The provider boundary (`stages/translation/Translation.stage.ts`) is already neutral: `Record<number, string>` in, `Record<number, string>` out, no knowledge of Payload or of any format."
- R3 (in) Correct ADR-3: field chunks already carry `idPath`.
  > "Today the pipeline's chunks have no location; only the projector computes `idPath`."
- R4 (in) Repoint the four broken citations.
  > "which is why `translate-document/handler.ts:52` captures the fingerprint before `translateContent` runs"
- R5 (in) Re-size phase 1 and say how `RichContainerChunk` becomes a `TranslationTarget`.
  > "| 1 | `TextChunk` union → `TranslationTarget` with `write()`; `TranslationMutator` collapses; Lexical import leaves the pipeline contract | S | none |"
- R6 (in) Mark the exceptions inside the §4.6 globs.
  > "| `src/core/translation-pipeline/**` (primitive, stages, strategies) | `DataReconciler` **stays** — it is Payload storage policy (§3) |"
- R7 (in) Fold in the three decisions taken since, and strike open question 5.
  > "5. **Does building the system prompt stay inside the provider?**"
- R8 (out) [inferred] Implementing any phase. This research changes no code — rests on: the brief
  asked for verification only, and the plan's own status is still *pending approval*.
- R9 (out) Re-deciding the design. [inferred] — rests on: the brief says verification only, and the
  ADRs were not contradicted by anything measured.

**Non-functional scan.** Performance: N/A — no runtime change. Security / access control: N/A.
Accessibility: N/A. i18n: N/A — the subject is translation plumbing, not the admin's own locale.
Observability: relevant — ADR-4's `onUnhandled` is the plan's only observability addition, and C10
confirms the silence it addresses is real today.

---

## Acceptance criteria

| AC | Covers | Criterion | How it is checked |
|---|---|---|---|
| AC1 | R1 | §2 states three members and its code block matches `TextChunk.ts` | read both, diff by eye |
| AC2 | R2 | §1 no longer claims the provider boundary is neutral, and names the two things that crossed it | read §1 against `Translation.stage.ts:21-48` |
| AC3 | R3 | ADR-3 states that field chunks carry `idPath` and only text chunks lack one | read ADR-3 against `FieldChunk.ts` |
| AC4 | R4 | Every `file:line` in the plan resolves to the construct its sentence describes | re-run the extraction in this document and open each |
| AC5 | R5 | Phase 1 states a size and says what happens to `RichContainerChunk` | read §6 row 1 |
| AC6 | R6 | No glob in §4.6 includes a path another row exempts without marking it | read §4.6 and expand each glob against `src/core` |
| AC7 | R7 | Open question 5 is struck; the strategy decision is reflected in all five places | grep the plan for `strateg` and read each hit |
| AC8 | R8, R9 | `git status` shows no change under `src/` | run it |

---

## Open questions

Coverage scan: failure states — N/A (document edit). Empty states — N/A. Boundaries — N/A.
Permissions — N/A. Concurrency / migration — relevant and already covered by the plan's §7 and §10.

1. **Phase 1 and the container chunk** *[non-blocking]* — `RichContainerChunk` has no `text` and
   writes by rebuilding `children`. Does it become one `TranslationTarget` whose `write` rebuilds
   the array, or several targets, one per fragment? Matters because: the answer sets phase 1's size
   and decides whether `TranslationTarget.text: string` survives as written.
2. **Does the provider boundary get restored, or is the plan amended to accept it?** *[non-blocking]*
   — `document` and `inlineMarks` now cross it. Matters because: §4.2's claim that the kernel half
   never names Payload is the plan's load-bearing promise, and `DocumentRef` names a collection.
3. **Re-measure the fraction** *[non-blocking]* — "~4/5 extracted" predates both changes. Matters
   because: it is the sentence most likely to be quoted when the work is scheduled.
4. **Does the plan get amended in place, or superseded?** *[non-blocking]* — seven corrections to a
   1020-line document whose status is still *pending approval*. Matters because: a reader who has
   read the old version will not re-read it.

**Restate check.** *"Already ~4/5 extracted"* — the fraction counts links, not effort; four of six
links were measured as cheap to move. *"The one real coupling"* — means the only place a new format
forces a change in a file that should not know about formats. *"Language"* in §4.5 means a nested
data structure that can be walked, not a human language; the document uses the word for both, which
is the one term in it most likely to be misread.

---

## Risks and constraints

- **The plan's status is unchanged.** It still says *designed, implementation pending approval*. The
  corrections do not make it approved.
- **Fingerprint migration stays confined to phase 5**, per §7 and §10. Nothing measured here moves
  that.
- **`core/no-payload-boundary.test.ts` is the only enforced part of the boundary today**, and it
  bans imports, not vocabulary. C2 crossed the boundary in a way that test cannot see — a
  `DocumentRef` is a structural type, not an import.

---

## Readiness

- Unresolved `[blocking]` questions: **0**
- IN requirements with no acceptance criterion: **0**

Soft spot: question 1 decides phase 1's size, and phase 1 is the first thing anyone would do.

**Next: sp-task** — the work is seven edits to one document, with every target located. Likely
architecture vectors: **structure only** — nothing here changes a module boundary, a contract or a
data model; it corrects a record of one.
