# The Lexical language, and the crossing into embedded blocks

Design: `~/.claude/plans/goofy-fluttering-phoenix.md` (settled in conversation, 2026-10-21)
Previous step: [the Payload field language](./2026-10-21-the-payload-field-language.task.md)

## Requirements / Task restatement

Write the production Lexical language for the traversal kernel, and the real `boundary` on
the Payload field language that crosses into it. Together they close the hole this plugin
has carried since the beginning: **text inside a block embedded in rich text is not
translated**, in either rich-text mode. Three identical `hasChildren` gates stop every walk
at a block node — `core/kernel/lexical/collectTextNodes.ts:18`,
`collectInlineFragments.ts:198`, `core/kernel/field-traversal/kernel.ts:81-82` — and the
current behaviour is asserted as intentional in `TranslationPipeline.test.ts:195`.

Payload hands the plugin a `lexicalEditor()` closure, so an embedded block's field schema
is unreachable from `field.editor`. The owner chose the fourth route: **the host names the
blocks it wants translated.** A block's absence from that list is itself the statement "do
not translate it", so an unlisted block is skipped **silently** — no warning, by decision.

**Out of scope, by the owner's explicit decision:** the public `richTextEmbeds` plugin
option and all pipeline wiring. The feature cannot work until the swap moves the pipeline
onto the kernel, and a published option that does nothing is a lie in the README. The block
list reaches the language through the crossing context in this step; the option lands at
the swap, with working behaviour. Container mode is also out — see D2.

## What already exists — platform · installed · project · verdict

| Needed | Found | Verdict |
|---|---|---|
| lexical node shapes, framework-free | `core/kernel/lexical/types.ts` (+ `types.conformance.test.ts`) | reuse |
| root / text-node / has-children guards | `core/kernel/lexical/guards.ts:14-34`, all three in the barrel | reuse |
| the blank-text rule | `core/kernel/utils/isEmpty.ts` — `trim() === ""` for a string, matching the oracle's filter exactly | reuse as `isEmpty` |
| the address grammar | `core/domain/content-projection/idPath.ts` — `elementSegment`, `renderSegment` | reuse |
| block field lookup by slug | shape the list as `BlockLike` (`core/kernel/field-traversal/types.ts:8-11`); `resolveBlockFields` is schema-shaped and does not fit a lexical node | own lookup, one `Map` |
| the host side | `src/languages/PayloadFields.language.ts` | extend |
| the shape of a lexical `Language` | `src/core/traversal/__tests__/fixtures/lexical.ts` | precedent, not a dependency — it stays an independent witness |

Nothing new from outside the package. No new dependency.

## Decisions

**D1 — The lexical walk contributes nothing to the address; only an embed contributes a
segment.** *Lost:* accumulating a child index per level, as the kernel fixture does
(`fixtures/lexical.ts:85-93`). *Constraint:* a rich-text field has exactly **one** address
today — `makeIdPath` stops at the field name (`FieldChunkCollector.ts:122`,
`contentProjector.ts:83`) — and the stored provenance fingerprint is keyed by that one
string (`Provenance.service.ts:105-115`, `SourceFingerprint.ts:48-50`,
`computeFieldFingerprints.ts:21-23`). Indices would turn `body` into `body.0.0`, so every
stored receipt would miss at the swap, and the symptom — "everything is stale" — sits far
from the cause. The kernel explicitly permits a non-unique address
(`contract.ts:31-40`), which is precisely today's shape: many chunks, one address. An embed
is the one place a segment is emitted, through the grammar the plugin already uses for
block elements, so a leaf inside one reads `body.<id>:<blockType>.<leaf>`.

**D2 — Per-node granularity only.** *Lost:* building container mode in the same step.
*Constraint:* per-node is the pipeline's default for anyone constructing it directly
(`TextChunkExpander.stage.ts:8`) and is the mode with a byte-identical oracle
(`containerMode.test.ts:70`). Container mode needs `collectInlineFragments` and
`inlineMarks` — neither is in the lexical barrel (`core/kernel/lexical/index.ts:1-12`) —
and brings its own failure vocabulary, fragment reordering and edge-whitespace rules.
Named deferral, not an omission.

**D3 — `payloadFieldsLanguage(richText?)`, one optional argument.** *Lost:* a required
parameter, and a second factory function. *Constraint:*
`PayloadFields.noRichTextCrossing.test.ts` constructs the language with no argument and pins
today's behaviour; it is an invariant of this step (AC10). Optional keeps that test valid
unchanged and makes "no crossing configured" a real, tested state rather than an
undefined one.

**D4 — Two separate block lists, `blocks` and `inlineBlocks`.** *Lost:* one flat list keyed
by slug. *Constraint:* `BlocksFeature` takes them as two lists
(`@payloadcms/richtext-lexical/dist/features/blocks/server/index.js:21-30`), and the same
slug may appear in both; a flat list would silently hand over the wrong field set. The
node's own `type` chooses the list.

**D5 — `boundary` re-applies the host's own selection rule before crossing.** *Lost:*
leaving it to `selects`. *Constraint:* the kernel consults `boundary` **first**
(`collect.ts:52-56`, `contract.ts:218-228`), so a boundary that skipped the rule would walk
into a rich-text field its host never marked for translation. The kernel already pins this
class at its own level (`crossing.unmarkedRichText.test.ts`).

**D6 — `boundary` seats a detached clone of the source tree into the working copy and hands
that clone over.** Taken during investigation, not in the plan. *Lost:* (a) handing over
`cursor.data[name]` as the reconciler left it; (b) doing the seating in `step`'s leaf case.
*Constraint:* `FieldChunkCollector.ts:155-158` does exactly this today, and its comment
names the reason — write-back mutates an object-valued leaf in place, so seating the
caller's own object would translate their source document. (a) loses because the reconciler
seats the **target**'s tree when it is non-empty, so the walk would re-translate the
previous translation instead of the source, which is not what `OverwriteStrategy` means.
(b) loses because `step` does not know whether a crossing is configured, so it would clone
for leaves `boundary` then declines.

**D7 — An unlisted block is skipped by `selects`, not reported.** *Lost:* reporting it
through `onSelectedWithoutText`. *Constraint:* the owner's decision — the list is the
statement of intent, and some blocks are deliberately untranslatable, so a warning would be
noise. Mechanically this needs no special case: `boundary` returns `null`, the kernel then
asks `selects`, and a block node is not a text node, so it is skipped and
`onSelectedWithoutText` is never reached (`collect.ts:58-63`).

### Placement

`src/languages/Lexical.language.ts`, beside `PayloadFields.language.ts` — the same
relationship `src/translation-providers/` has to the port in
`core/domain/translation-providers/`: the kernel holds the `Language` contract, the
implementations sit outside it and import inwards, never the reverse. Role tag
`.language.ts`, per the package's file-naming table.

### New surface — the shape check fired

Triggers: an exported function gains a parameter · the parameter is optional · it carries
two or more fields that are always set together.

| | A: `payloadFieldsLanguage(richText?: RichTextCrossing)` | B: `payloadFieldsLanguage(opts?: { richText?: RichTextCrossing })` |
|---|---|---|
| cost of the next field of this kind | one — add it to `RichTextCrossing` | one — same |
| states admitted / produced | 2 / 2 → gap **0** | 3 / 2 → gap **1** (`{}` is admitted, never produced) |
| second caller already in the codebase | the two new test suites; the swap step names the third | same |
| breaks for an implementor outside this repo | nothing — `src/languages` is not exported from `src/index.ts` | same |

**Chosen: A.** B loses on the one state nobody produces. Inside `RichTextCrossing`, both
lists are **required** (a host with no inline blocks passes `[]`), which is what keeps the
gap at zero.

### Written contract

Yes — `EmbedResolver` owes its callers something its signature cannot state: which of
`boundary` and `selects` owns which case, and that returning `null` means *skipped
silently*, not *reported*. That is the `/sp-red-test` trigger for this step.

### Escalate to `/sp-architect`?

No. One module, no new dependency, no data-model change, and the seam — the `Language`
port — already exists and is already in use.

## Acceptance Criteria

From `packages/payload-plugin-translator`.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | The language collects exactly the text `RichTextExpander` collects, in order, for a tree with no embeds | `bunx vitest run src/languages/__tests__/Lexical.differential.test.ts -t "same text"` | the two lists are equal, in order, text verbatim including surrounding whitespace |
| AC2 | **Addresses**: every prose unit carries the field's own single address, byte-identical to the `idPath` `FieldChunkCollector` produces for that field | same file, `-t "same address"` | equal as strings, rendered through the plugin's own grammar — not `String()` |
| AC3 | Writing back through both paths leaves identical trees | same file, `-t "same tree"` | `toEqual` |
| AC4 | Text inside an embedded block is collected and written back | `bunx vitest run src/languages/__tests__/Lexical.embeddedBlock.test.ts -t "collects"` | the block's leaf text appears among the targets; after writing, the tree carries the translation |
| AC5 | An embedded leaf's address is `<field>.<id>:<blockType>.<leaf>` | same file, `-t "addresses"` | the exact string, through the plugin's grammar |
| AC6 | **Unhappy** — a block whose slug is in neither list is skipped silently | same file, `-t "unlisted"` | no target for it, `onSelectedWithoutText` not called, siblings still collected |
| AC7 | A slug present in both `blocks` and `inlineBlocks` resolves to the list its node type names | same file, `-t "same slug"` | each node yields its own list's leaf |
| AC8 | **Unhappy** — `enter` refuses a context whose tree is not a lexical root | `bunx vitest run src/languages/__tests__/Lexical.refusesForeignContext.test.ts` | `CannotEnterLanguageError` naming this language |
| AC9 | The host's own rule still applies inside the embed | `Lexical.embeddedBlock.test.ts -t "host"` | a non-localized field inside the block yields no target |
| AC10 | `payloadFieldsLanguage()` with no argument behaves exactly as today | `bunx vitest run src/languages/__tests__/PayloadFields.noRichTextCrossing.test.ts` | both cases pass, assertions unchanged |
| AC11 | Nothing is wired | `grep -rn "languages" src/index.ts src/core/translation-pipeline/` | no match |
| AC12 | The rest of the suite does not move | `bunx vitest run` | 174 files / 2268 checks plus only the new ones, all passing |
| AC13 | Clean types and lint | `bun run check-types`, `bunx oxlint .` | 0 type errors; 0 lint errors, ≤45 warnings |

## Pre-flight

Against the untouched tree, 2026-10-21, branch `feat/translator-payload-fields-language`.

| AC | Command | Result | Classification |
|---|---|---|---|
| AC1–AC9 | the three test files | absent — no such file | **change** — fails now |
| AC10 | `bunx vitest run src/languages/__tests__/PayloadFields.richTextNotYet.test.ts` (renamed during review to `PayloadFields.noRichTextCrossing.test.ts`; see the Review log) | 1 file, 2 checks, passing | **invariant** |
| AC11 | `grep -rn "languages" src/index.ts src/core/translation-pipeline/` | no match | **invariant** |
| AC12 | `bunx vitest run` | 174 files, 2268 checks, passing | **invariant** |
| AC13 | `bun run check-types` · `bunx oxlint .` | 0 errors · 45 warnings, 0 errors | **invariant** |

`src/languages/Lexical.language.ts` is absent, so every AC1–AC9 check fails for the right
reason: the thing under test does not exist.

## Risk notes

**High risk**, and the classification changes what the later phases do: a mandatory
evidenced regression sweep in Phase 4, and three review angles in Phase 5b.

- **AC2 is the one that matters.** An address that differs by one escaped character makes
  every stored receipt miss at the swap. D1 is the whole defence, and the check must render
  through the plugin's own grammar rather than stringifying the kernel's tokens.
- **D6 puts a write inside `boundary`.** A predicate-shaped function with a side effect is
  a smell; it is here because the handover and the seating are the same event, and because
  the alternative placements each misfire (see D6). If review finds a third placement that
  keeps them paired, take it.
- **The `#index` fallback is weaker here than elsewhere.** With D1 the lexical tree
  contributes no scope, so two id-less sibling blocks would collide on `#0`. Unreachable in
  practice: `SerializedBlockNode.fields` is `BlockFields = { id: string } & …` — **required**
  (`@payloadcms/richtext-lexical/dist/features/blocks/server/nodes/BlocksNode.d.ts:12-20`).
  Recorded, not designed around.
- The kernel's crossing cap is 8 (`DEFAULT_MAX_CROSSINGS`), and one rich-text level costs
  two crossings. Deep nesting raises `TooManyCrossingsError` rather than looping.

## Open, for the swap — recorded, not solved

**The projector does not yet produce embed-leaf addresses, and the swap must not forget it.**
`computeFieldFingerprints` reads `projectTranslatableContent`, which emits exactly one entry per
rich-text field at the field's own address and never descends into the tree
(`contentProjector.ts:40-41, 82-85`). `Provenance.service.record` iterates `currentFields` only
(`:105-108`), so a translated address such as `body.b1:cta.heading` is silently dropped today — and
`staleness.sameAddresses` requires the stored and current key sets to be equal. If the new languages
are wired into `record()` **before** the projector emits the same embed-leaf addresses, every record
becomes permanently stale. Prose addresses are unaffected: they stay the field's own single address,
which is what the differential check compares against the old pipeline's real `idPath`.

**The address grammar is re-entered in a test helper only.** `__tests__/addresses.ts` converts a
walk's loose address back into the plugin's branded `IdPath`. Production will need the same step at
the swap, and it should live beside the grammar rather than beside the tests.

**Container mode** (D2) and the **public `richTextEmbeds` option** — both deferred by decision.

## Human choices

- **2026-10-21** — Route to the block schema: *"Да, похоже этот вариант будет самым лучшим.
  Да, давай делать его"* — the host names the blocks (route 4), chosen over calling the
  editor provider, reading the resolved adapter, or relying on Payload's in-place mutation.
- **2026-10-21** — An unlisted block is skipped without a warning: *"Молча пропустить, если
  пользователь ответственен за то чтобы добавлять блоки самостоятельно, то я рассчитываю на
  то что он знает что делает… Некоторые блоки могут быть в целом непереводимыми и добавлять
  их незачем."*
- **2026-10-21** — Option name `richTextEmbeds`, not tied to blocks, because links and
  uploads also carry host fields in Lexical: *"richTextEmbeds - отлично."*
- **2026-10-21** — Scope of this PR: the languages only; the public option lands at the swap,
  with working behaviour. (Chosen at the gate over shipping a dead public option.)
- **2026-10-21** — `localized` inside an embed: no special rule. The plugin already
  snapshots the schema before Payload's sanitizer deletes the flag
  (`projectFieldLike.ts`), and the owner recognised this from the existing design:
  *"мы решали эту проблему копированием исходной схемы пока payload не затёр поля"*.

## Review log

### 2026-10-21 — three review angles (high risk)

**Traversal correctness: no findings.** The reviewer independently confirmed D6 is safe on every
path the kernel can take — `boundary` runs once per leaf visit, every non-null return is crossed into
immediately, and the only post-seating failures (`TooManyCrossingsError`, an unregistered language
id) abort the whole walk, so no orphan clone is left behind. It also confirmed the prose path matches
the oracle exactly, including a node that carries `text` under a non-`text` type.

**Addresses — two findings, both applied.**

*The positional fallback could collide* (major). With D1 the tree contributes no scope, so
`#<sibling index>` repeated under a different parent: two id-less inline blocks, each at index 1 of
its own paragraph, both rendered `body.#1.label`, and `staleness.ts` cannot tell two leaves apart
under one key. The cursor now hands out each embed's **ordinal within the field**, counted in
document order over every embed whether or not it declares an `id`. Counting all of them — rather
than only the anonymous ones — keeps the rule stateable in one sentence and avoids duplicating
`elementSegment`'s own condition. Three checks now pin it, and two mutations (a per-parent counter,
and a constant zero) turn all three red. Unreachable for Payload data either way: `id` is required on
both `BlockFields` and `InlineBlockFields`.

*The brand's promise was overstated* (major). `idPath.ts` claimed a token that did not come from
`renderSegment` cannot reach `joinRendered`. True for a caller holding segments, false for one
holding a walk's address, which is `(string | number)[]` by design so the kernel can stay ignorant of
every grammar. Both that claim and the test helper's were rewritten to say what is actually
guaranteed, and where the one re-admission happens.

**The test suite — four findings, all applied.**

*A whole node shape was unguarded* (major, and the most serious of the run). Nothing covered a node
that carries host `fields` **and** children with text — which is exactly what a Payload `link` node
is. The reviewer made `step` skip any node with an object `fields`, dropping all link text from
translation, and all 153 checks stayed green. A link case and an upload case were added to the
differential, where the old pipeline decides; that mutation now turns three checks red.

*A blank node raised no alarm, and nothing said so* (major). `walkDocument` returns `reported`, and
no check read it. A mutation that pushed ordinary whitespace through `onSelectedWithoutText` passed
the whole suite. Two checks added; the mutation now turns both red.

*The id-less address check could not tell two semantics apart* (minor) — folded into the address
finding above.

*The source-untouched guarantee was only checked without embeds* (minor). Extended to a two-level
case. Both checks go red on the same mutation; no mutation yet separates them, which is recorded
rather than claimed otherwise.

**One mutation turned nothing red and is not a gap.** Skipping the clone when the working copy and
the source are the same object leaves every check green — on the nested path they already alias
inside the seated clone, so the second clone changes nothing. The redundancy is noted; removing it
would trade a cheap copy for a subtle precondition.

**Totals after the review.** 165 checks in `src/languages`, 2367 in the package. 19 mutations run,
18 discriminating, 1 behaviourally equivalent. Types 0, lint 45 warnings / 0 errors, both mechanical
gates clean.

### 2026-10-21 — comment audit

26 blocks judged, 26 verdicts. 9 deleted, 13 shortened, 3 answered by changing the code, 1 kept
with a named reason, 2 missing notes added. Comment lines over the change: **108 → 74**; the single
inline comment is gone. The density verdict was *too dense* on the docblocks alone — 4.3 lines per
exported symbol on a module that `src/index.ts` does not export, so the usual "this is the public
surface" defence did not apply.

Three verdicts changed code rather than prose:

- `twoLevels` renamed `embedInsideEmbed`; the comment that repaired the name is gone.
- The differential oracle now imports `defaultExpanders` from the expander stage instead of
  hand-listing `[new RichTextExpander(), new PlainTextExpander()]` under a docblock claiming they
  were "the expanders its stage runs by default". The claim is now enforced by the import, and the
  oracle moves with the stage if its defaults ever change. `defaultExpanders` was made public on an
  **internal** barrel only; it is not reachable from `src/index.ts`.
- `seatWritableTree` renamed `seatSourceClone`, so the name says where the copy comes from.

**One verdict was taken in part, and the disagreement is recorded here.** The auditor proposed
hoisting `isTranslatableLeaf` into a named binding shared by `selects` and `boundary`, to replace
the inline comment explaining why `boundary` repeats the host's rule. The comment was deleted; the
hoist was not. The sameness is already structural — the same function is the `selects` member and
the call inside `boundary`, fifteen lines apart — so an alias would name nothing new, and the
*reason* is written where an implementor of `boundary` must already read it
(`core/traversal/contract.ts:188, 218-228`). The constraint is also test-guarded: removing the check
turns four checks red (mutation M14).

### 2026-10-21 — stub audit and the mutation battery

Against a Lexical language that enters and then walks nothing, **81 of the 165 checks in
`src/languages` go red**. Of the 84 that survive, 82 exercise the field language or the old
pipeline rather than this one. Two did not, and were a real gap: "an unlisted block is skipped
silently, not reported" asserted an absence with no anchor, so a language that walked nothing
satisfied it. Both now assert first that the walk produced targets.

22 mutations run in all; **21 discriminate**. The one that does not is behaviourally equivalent, not
a hole: skipping the clone when the working copy and the source are the same object changes nothing,
because on the nested path they already alias inside the seated clone.

### 2026-10-21 — abstraction audit (judged by the author)

Scope was derived from the target rather than taken from the brief, and the brief had omitted two
boundaries — one of which carries the run's only finding.

**Finding — the host is compile-time coupled to the guest, while its own option says it is not.**
`RichTextCrossing.languageId: string` exists so a different rich-text language can be configured.
But `PayloadFields.language.ts:18` imports `EmbedKind` and `EmbedResolver` **from
`Lexical.language.ts`**, and `EmbedKind` is `"block" | "inlineBlock"` — Payload's names for embeds
*in Lexical*. A Slate language has neither node type, so it could not satisfy the resolver the host
builds, and the host would have to change. Honesty: the type admits any `languageId`; the system
serves one shape of guest. `core/traversal/contract.ts:124-127` states the rule this inverts — a
language must not name its successor by a literal; here the host names it by import, which binds
harder.

Proposal, not applied: move `EmbedKind`, `EmbedResolver` and the `{ tree, embed }` context shape
into a module neither language owns, so both depend on the convention instead of one depending on
the other.

**Second boundary, no finding admitted.** `src/languages/index.ts` has **zero importers** and
exports five names (`EmbedKind`, `LexicalCursor`, `LexicalNode`, `RichTextCrossing`,
`PayloadFieldsCursor`) that nothing outside their defining file names. Necessity is `n/a` — it is
not a published entry point — but the surplus is recorded for the swap, when the barrel gains its
first caller and the question becomes real.

### 2026-10-21 — complexity audit (assumption mode)

History over `src/languages/` is mute — the whole directory is uncommitted — so no edits were made
and every count is a proposal.

Scenario: **add a second rich-text language** (Slate is the realistic one; Payload ships it).
Neighbourhood, 8 files: the two languages, `contract.ts`, `collect.ts`, `walk.ts`, `idPath.ts`,
`translatableLeaf.ts`, `kernel/lexical/guards.ts`.

| Counter | Today | After the abstraction finding's proposal |
|---|---|---|
| CHANGE | 4 — the new language, the barrel, the host's `definitions`/`resolveEmbed`, and the types' home | 2 — the new language and the barrel |
| READ | 7 | 7 |
| STATE | 8 — 2 embed kinds × claimed/unclaimed × with/without `id` | 8 |

CHANGE falls, READ does not rise, so the balance rule holds. **This is the same root cause the
abstraction audit found, counted through a second lens — not a separate finding.**

Rules recovered, all essential, each with a source: the leaf-selection rule
(`translatableLeaf.ts:28-31`); one address per rich-text field (D1, and
`FieldChunkCollector.ts:122`); an unlisted embed is skipped without a warning (D7, the owner's own
words in `## Human choices`); the crossing seats a clone taken from the source (D6, mirroring
`FieldChunkCollector.ts:157`); an embed's ordinal counts every embed, not only the id-less ones (the
address review, above).

### 2026-10-21 — the abstraction finding, applied

The owner asked for it. `EmbedKind`, `EmbedResolver` and the crossing's context shape moved out of
`Lexical.language.ts` into `src/languages/richTextCrossing.ts`, a module neither language owns.
Both now depend on the convention; neither depends on the other, and `grep` over both files
confirms the edge in each direction is gone.

Stating the convention separately settled what `EmbedKind` actually names. It is not a list of
Lexical node types — it names **the host's two block lists**, `blocks` and `inlineBlocks`, and a
rich-text language maps whatever its own format calls an embed onto one of them. That is what makes
it shared vocabulary rather than one side's, and it is why a Slate language can now be added without
touching the host.

The move also closed the second half of the finding, which was not in the proposal. The crossing's
context was built as a bare object literal and read back by structural narrowing, with no type on
either side, because the kernel types `Crossing.context` as `unknown` by design. The producer now
annotates it `RichTextContext`. A probe misspelling the key proves the difference:

```
src/languages/PayloadFields.language.ts(214,9): error TS2353: Object literal may only specify
known properties, and 'embedResolver' does not exist in type 'RichTextContext'.
```

Before the move that literal compiled and the walk refused at runtime. `tree` stays `unknown` on
purpose — only the language that walks it knows its format — so the consumer still narrows, which
it already did.

Counters for the scenario that produced the finding, recounted on the code as it now is: adding a
second rich-text language is **CHANGE 4 → 2** (the new language and the barrel; the host no longer
changes), READ 7, STATE 8. The balance rule holds, and the promise matches the result.

After the move: 177 files / 2367 checks passing, types 0, lint 45 warnings / 0 errors, both
mechanical gates clean. The two headline mutations still discriminate — a descent that emits a token
turns 49 checks red, a boundary that never crosses turns 28.

### 2026-10-21 — the address grammar's own tests, audited by mutation

The owner asked whether `idPath.ts` is tested, especially its escaping, and whether those tests were
written red.

**Red-first cannot be proven.** `idPath.test.ts` and `idPath.ts` landed in one commit — `6ae2f0c8`,
2026-07-01, 127 lines of test beside 79 lines of implementation. The file's header comment says
"RED until implemented", which is a claim, not a trace. Mutation is the instrument that settles it.

**Thirteen mutations over `enc`, `render`, `SEP` and `elementSegment`. Two survived the whole
2367-check suite:**

- **A literal backslash was escaped by the code and checked by nothing.** `enc`'s class is
  `[\\#.:]`, and `\\` is what keeps escaping reversible — without it a key named `a\` followed by a
  key named `b` renders exactly like the single dotted name `a.b`, so two different locations share
  one address and one receipt. Dropping `\\` from the class left all 2367 checks green.
- **`isBlocks` was unguarded in one direction.** The suite covers a blocks field whose element has
  no `blockType`; nothing covered a **non**-blocks element that happens to carry one. Ignoring
  `isBlocks` entirely — folding a `blockType` into an ordinary array element's address — turned
  nothing red.

Both are closed, stated as collisions in the file's own idiom, and both now turn exactly one check
red under the mutation that exposed them.

**Two further mutations are caught only by a check added today.** Escaping just the first occurrence
in a token (dropping the `g` flag), and not escaping the `blockType`, both pass `idPath.test.ts`
untouched and are caught solely by `Lexical.embeddedBlock.test.ts > addresses an embed through the
plugin's address grammar, escaping included` — the `body.b\.1\#x:c\:ta.heading` case, which is the
only place in the repository that puts two escapes in one token and escapes a `blockType`. Worth
knowing: the grammar's own suite is thinner than it reads, and that case is now load-bearing for a
module it does not belong to.

After: 177 files / 2369 checks passing, types 0, lint 44 warnings / 0 errors.

### 2026-10-21 — barrels re-checked against the owner's rule

The owner stated it: an `index.ts` carries **only what is used outside its module**; everything
else stays inside. Every barrel this change touches was measured by resolving real import
statements — not by counting references, which matches the defining file, the barrel itself and
every sibling that imports by path, and had produced a wholly false reading on the first attempt.

| Barrel | Exported | Taken from outside | Verdict |
|---|---|---|---|
| `src/languages/index.ts` | 11 | **0** | trimmed to 4 |
| `src/core/traversal/index.ts` | 18 | 12 | this change added one name, `StepChild`, which `PayloadFields.language.ts` names; the rest stands by E14 of the kernel's own contract |
| `.../stages/text-expander/index.ts` | 9 | 1 | this change added one name, `defaultExpanders`, which the differential oracle names |

`src/languages/index.ts` was entirely surplus: nothing outside the module imported it at all, and
the seven type exports were dead — removing them changed nothing in 2369 checks. It now carries the
four names the swap will name to build the languages (`payloadFieldsLanguage`, `PAYLOAD_FIELDS_ID`,
`lexicalLanguage`, `LEXICAL_ID`); the types reach their callers contextually, as ADR-0002's first
question requires.

The rule is now written down for the package, in `CLAUDE.md` under *What goes into any other
`index.ts`*, including the mechanical check and the measurement trap that produced the false reading.

One thing is recorded and not acted on: `PathSegment` is among the kernel barrel's six names that
no outside importer takes, and a consumer naming `IdPath` gets it structurally. That barrel's shape
is E14's decision in its own contract, so it is flagged here rather than changed.
