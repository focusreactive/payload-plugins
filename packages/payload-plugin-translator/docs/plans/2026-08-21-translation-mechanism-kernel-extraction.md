# Architecture design — extract the translation mechanism into one kernel primitive

**Date:** 2026-08-21
**Status:** designed. Implementation pending approval.
**Kind:** internal structural refactor (phases 1–3 behavior-preserving, no public API change →
`refactor:`), then a behavior change (phase 5, `feat:` + a provenance migration) and a package split
(phases 4 and 6).
**Direction set by the owner (2026-08-21), superseding part of the 2026-07-31 verdict:** the core is to
become a **separate published package** the plugin consumes as a third-party dependency, and the
traversal vocabulary is to be **generalized off Payload's semantics** regardless of whether a second
CMS product ever appears. What remains rejected from that verdict is the L3 work (lifting the locale
storage model / `sharedRow`) — see §3. The internal drivers for L2 are now concrete: a real package
boundary and the `Payload → Lexical → Payload` nesting (§4.5, §5.3).
**Follows:** [2026-07-31-core-agnosticism-options-and-value.md](./2026-07-31-core-agnosticism-options-and-value.md)
· [2026-07-31-core-portability-storyblok-research.md](./2026-07-31-core-portability-storyblok-research.md)
· [2026-07-17-core-layering-redesign.md](./2026-07-17-core-layering-redesign.md)

---

## The ask

Lift the *translation method* — walk the tree, select leaves by a condition, flatten them into an
index-correlated list, send the text out, write the results back by mutating the same objects — into a
single kernel primitive, so it stops being spread across five pipeline stages. Establish how tightly
that method is currently welded to Payload's data shapes and how cleanly it can be separated.

Two decisions widen that ask, taken by the owner on 2026-08-21 (see the Status block): the core ships as
a **separate published package**, and the traversal vocabulary is **generalized off Payload's
semantics**. This is not a return to "agnosticism for portability's sake" — that argument stayed
rejected. The justification is still internal: the package makes the payload-free boundary enforceable
instead of agreed, and the generalization is a precondition for traversing
`Payload → Lexical → Payload` nesting at all (§5.3).

---

## 1. What the method is made of today

Measured, not estimated. Six links, with very different coupling:

| # | Link | Where | Coupled to |
| --- | --- | --- | --- |
| 1 | Tree walk | `core/kernel/field-traversal/walkFields.ts` | **Nothing in the data.** The engine owns recursion + structural dispatch; the caller owns data through an opaque `Cursor` the engine never reads. Coupled to Payload's *schema vocabulary* via `classifyField` (`kernel.ts:66-90`), not to data shape |
| 2 | Leaf selection | `domain/content-projection/translatableLeaf.ts:17,28-31` | Type names `text`/`textarea`/`richText`, the plugin's own target marker (spelled `localized` on `FieldLike` by name coincidence — see ADR-5), exclusion via `custom.translateKit`. One 4-line predicate |
| 3 | Flatten + index correlation | `translation-pipeline/stages/text-expander/TextChunkExpander.ts:24-44` | Nothing meaningful. An index counter over an injectable `TextExpander[]` — **already a port** (`TranslationPipelineOptions.textExpanders`) |
| 4 | Rich-text descent | `kernel/lexical/collectTextNodes.ts` via `RichTextExpander.ts` | Lexical — but already behind the link-3 port |
| 5 | **Write-back by mutation** | `types/TextChunk.ts:1,23-40` + `stages/translation-applicator/TranslationMutator.ts:18-27` | **The real coupling.** See §2 |
| 6 | Making the copy | `stages/data-reconciler/DataReconciler.ts` | Payload's *storage model*: `sharedRow`, `id` keep/strip (`:107,:112`), `blockType`, element pairing by `id` (`kernel.ts:161-175`) |

The provider boundary (`stages/translation/Translation.stage.ts`) is already neutral: `Record<number,
string>` in, `Record<number, string>` out, no knowledge of Payload or of any format.

So the method is already ~4/5 extracted. What blocks calling it a primitive is link 5, and what
must be kept *out* of it is link 6.

### 1.1 Where the rich-text format is distinguished today

The traversal engine never distinguishes it: `classifyField` has no notion of `richText`, and every
text-ish field lands in the same `leaf` kind. The distinction is made in four places, and — the point
worth noting — the two walks make it at *different times*:

| Site | When | What it does |
| --- | --- | --- |
| `domain/content-projection/translatableLeaf.ts:18` | inside both walks | set membership (`text` / `textarea` / `richText`), not a branch |
| `domain/content-projection/translatableLeaf.ts:42` (`leafSourceText`) | **inside** the fingerprint walk | branches on `field.type === "richText"` and joins Lexical text nodes |
| `strategies/SkipExisting.strategy.ts:19-21` | **inside** the collect walk, via the strategy port | sniffs a Lexical root **by value shape** and calls `isEmptyRichText` |
| `stages/text-expander/RichTextExpander.ts:14` + `types/TextChunk.ts:24,50` | **after** the collect walk (stage 3) | the actual plain-vs-rich split, on `chunk.schema.type` |

Two consequences the design has to answer. First, the selection predicate is already shared
(`isTranslatableLeaf` is called by both walks) but the **text extraction is not**: the pipeline goes
through `RichTextExpander` a stage later, the projector through `leafSourceText` inline. That split —
not the fact that there are two walks — is what makes a per-format fix land in one consumer and not the
other (§5.2). Second, `SkipExisting` holds format knowledge behind the **strategy** port rather than
the format port, and it duck-types the value instead of reading the schema — see ADR-6.

## 2. The one real coupling: write-back is a closed union

"Where the translation goes" is expressed as a two-member discriminated union, with a Lexical type
baked into the pipeline's own contract:

```ts
// types/TextChunk.ts
import type { SerializedTextNode } from "../../kernel/lexical";   // format leaks into the contract

type PlainTextChunk    = { type: "plain";    index; text; dataRef; key };
type RichTextChunk     = { type: "richText"; index; text; nodeRef: SerializedTextNode };
export type TextChunk  = PlainTextChunk | RichTextChunk;
```

and `TranslationMutator` re-derives the branch by hand:

```ts
if (isPlainTextChunk(chunk))      chunk.dataRef[chunk.key] = translation;
else if (isRichTextChunk(chunk))  chunk.nodeRef.text = translation;
```

The asymmetry is the defect: **extraction is open** (an injectable expander array) while
**write-back is closed**. Every new format needs a new union member *and* a new branch in the mutator,
in a file that has no business knowing about formats.

Consequence beyond tidiness: three parallel structures (`index`, `textMap: Record<number,string>`,
`translations: Record<number,string>`) exist only to re-associate what a closure would have kept
associated.

## 3. Non-goals — what must not move into the primitive

- **`DataReconciler` and `sharedRow`.** This is Payload storage policy, not mechanism: keep an
  array/block row's `id` when the row is shared across locales, strip it when rows are per-locale.
  Getting it wrong wipes other locales' content — the bug class behind #69 and #31. It stays exactly
  where it is, and stays the caller's step *before* the primitive runs.
- **`matchElementById`.** Pairing elements across locales by `id` (+ `blockType` for blocks) is a
  Payload *convention*, and today it sits in `kernel/` where mechanism lives. It moves into the Payload
  language's cursor, where building a list element's child cursor happens anyway (ADR-7) — so it is not
  even a kernel port. No behavior change.
- **Strategies** (`overwrite` / `skip_existing`). Domain policy; they stay in
  `translation-pipeline/strategies` and reach the primitive through the selection port.
- **Merging the two walks into one pass.** The fingerprint projection keeps its own walk (§4.3). It
  must run on the **pristine source before anything is written**: the pipeline mutates in place and
  shares object-valued leaves (rich-text nodes) with `sourceData` by reference, so hashing after
  translation would hash the translation and make every fresh translation look instantly stale — which
  is why `translate-document/handler.ts:52` captures the fingerprint before `translateContent` runs,
  and why `ProvenanceService.captureFingerprint` documents the ordering. Sharing the *extractors* is
  the goal; sharing one traversal pass is explicitly not, because a single pass over already-mutated
  targets would violate that ordering silently.
- **L3 — the locale storage model.** Still out, and now the *only* part of the July verdict that
  stands: `sharedRow`, `id` retention, and the two-parallel-trees assumption stay Payload policy in the
  plugin. (L2 — the convention-neutral traversal vocabulary — is now in scope by owner decision; see
  §4.5, §4.6 and §5.3.)
- **`id` / `blockType` as core concepts.** Generalizing the *vocabulary* does not mean the core learns
  element identity. Pairing lives inside the Payload language, and the kernel has no node type of its
  own to leak an `id` field into (ADR-7).

## 4. The design

### 4.1 One target type, replacing two

```ts
/** One unit of translatable content: WHERE it lives, WHAT it says, HOW to write the result back. */
type TranslationTarget = {
  /** Location, element-id-keyed — reorder-invariant. Reused from domain/content-projection/idPath. */
  idPath: IdPath;
  /** The source text handed to the provider. */
  text: string;
  /**
   * Applies the translated text. Absent on a read-only walk (the fingerprint projection), so a
   * read-only consumer cannot mutate by accident — the type enforces it.
   */
  write?: (translated: string) => void;
};
```

This single type subsumes both of today's shapes: the projector's `ProjectionEntry { idPath, text }`
(`domain/content-projection/contentProjector.ts:21-24`) and the pipeline's `TextChunk`
(`{ index, text, ref }`). The index is no longer a field — it is the position in the returned array,
and `Record<number, string>` survives only as the provider wire format.

### 4.2 The primitive

The kernel never reads data. It drives recursion; a **language** answers "where do I descend and what
is there", because only the language knows both its own schema vocabulary and its own data layout. That
single rule is why no Payload knowledge is needed here: the kernel never writes `data[field.name]`.

```ts
// core/kernel — no imports at all.

/** What one node of some language turns into. The three node kinds of §4.5 are expressed by
 *  this shape, not by a `kind` field of their own: one child group = object, N groups = list,
 *  the same group with the same cursor = a container that opens no data level, none = value. */
type Step<N, C> =
  | { kind: "children"; items: Array<{ nodes: N[]; cursor: C; segment: PathSegment }> }
  | { kind: "value"; value: unknown; setValue?: (v: unknown) => void; segment: PathSegment }
  | { kind: "skip" };

/**
 * A traversal language: one kind of nested data structure that can be walked, plus how it reads and
 * writes text at its own leaves and where it hands control to another language. Subsumes what an
 * earlier draft called `Extractor` — "what text is inside this value" and "how do I walk this
 * structure" were two names for one object. See §4.5 for the two shapes a language can take and for
 * boundary detection, and §4.7 for a worked implementation.
 *
 * `isEmpty` replaces `SkipExistingStrategy.isEmptyValue`, which today sniffs a Lexical root by shape
 * and calls `isEmptyRichText` (`strategies/SkipExisting.strategy.ts:19-21`) — format knowledge behind
 * the *strategy* port. Asking the owning language instead is what makes "one home per structure" true.
 */
type Language<N, C> = {
  id: string;

  /** Activation: build my root nodes + cursor from the value and context I was handed. */
  enter(args: { value?: unknown; context: unknown }): { nodes: N[]; cursor: C };

  /** The only data access in the system. */
  step(node: N, cursor: C): Step<N, C>;

  /** Leaves, in my vocabulary. */
  selects(node: N, cursor: C): boolean;
  isEmpty(value: unknown): boolean;
  /**
   * One unit per translatable piece of text at this leaf — per text node for a rich-text structure,
   * exactly one for a plain string. Unit granularity is what the pipeline needs; a field-level
   * consumer joins one leaf's units, which is how the fingerprint keeps its current granularity and
   * therefore its current values (§4.3).
   */
  textUnits(leaf: { value: unknown; setValue?: (v: unknown) => void }):
    Array<{ text: string; write: (t: string) => void }>;

  /** Outgoing boundary: this leaf's content belongs to another language (ADR-8, ADR-9). */
  boundary?(node: N, cursor: C, value: unknown): Crossing | null;

  /** Last-resort claim on a value, for a host that cannot declare (ADR-8, rule 3). */
  claims?(value: unknown): boolean;
};

/** How a language is activated. Identical for the root and for every crossing (ADR-12). */
type Crossing = { language: string; context: unknown };

function collectTranslationTargets(args: {
  /** Every language this walk may enter. The kernel ships none (ADR-11). */
  languages: Language<never, never>[];
  /** Bootstrap: a synthetic crossing with no declaring node (ADR-12). */
  entry: Crossing;
  /** Host policy layered on a language's own `selects` — the translation strategy, mainly. */
  select?: (leaf: { node: unknown; cursor: unknown; value: unknown }) => boolean;
  /** Reported instead of silently skipped when a selected leaf yields no text units. */
  onUnhandled?: (idPath: IdPath, value: unknown) => void;
  /** Guard for `Payload → rich text → Payload → …` nesting (ADR-9). */
  maxDepth?: number;
}): TranslationTarget[];
```

`applyTranslations(targets, translations)` is four lines with no knowledge of any structure:

```ts
for (const [i, target] of targets.entries()) {
  const translated = translations[i];
  if (translated !== undefined) target.write?.(translated);
}
```

**ADR-12 — the root is activated exactly like a crossing.** `entry` is a `Crossing` with no declaring
node and no value, so there is one code path that activates a language and no way to bootstrap one
around the registry. It is a starting point, not a rule: at the root there is nothing to detect *from*,
and the host always knows its own schema — asking it to name the language costs one field and removes a
guessing path. A host that genuinely does not know its root falls back to `claims` (ADR-8, rule 3).
Several unrelated roots in different languages would be two calls and a concatenation, not a wider
signature.

### 4.3 What is shared, and what each consumer keeps

The shared layer is the **languages** — the per-structure answer to "what text is inside this value, and
how is each piece written back". Not the traversal driver.

| Consumer | Traversal | Selection | Extraction | Granularity |
| --- | --- | --- | --- | --- |
| Translation pipeline | `collectTranslationTargets` (§4.2), three trees in the cursor | the language's `selects` **and** `strategy.shouldTranslate` | the shared languages, with `write` | one target per text unit |
| Fingerprint projection (`projectTranslatableContent`) | **keeps its own walk**, one tree, read-only | the language's `selects` | the same languages, `write` ignored | joins one leaf's units into one entry |

Why the projection keeps its own walk rather than being ported onto the primitive:

- **Ordering.** It must hash the pristine source before any write happens (§3, last bullet). A walk of
  its own makes that structural instead of a rule someone has to remember.
- **Fingerprint values stay put.** Joining the units of a leaf reproduces exactly what `leafSourceText`
  produces today, so phase 3 changes no stored fingerprint. Only phase 4 does — which keeps the
  migration surface confined to one phase (§7).
- **The payoff does not need it.** What makes a per-structure fix reach both consumers is the shared
  language, not a shared traversal. Deduplicating the two walks would be a nice-to-have bought with
  risk in the wrong place.

The pipeline's "seed the copy with the source value before translating"
(`FieldChunkCollector.ts:137-139`) stays a separate explicit pass in the domain-level wrapper — it is
strategy semantics, not mechanism.

### 4.4 ADRs

**ADR-1 — the cursor shape is fixed by the primitive, not caller-owned.**
`walkFields` deliberately keeps `Cursor` opaque. The primitive gives that up and fixes
`{ data, source, target, segments }`, because both consumers need exactly these and a
"bring-your-own-cursor" primitive would be `walkFields` with extra steps. Read-only callers pass
`source = data`, `target = {}`.
*Rejected:* generic cursor with a `readValues` adapter — indirection with one shape behind it.

**ADR-2 — write-back is a closure carried by the target, not a discriminated union.**
Whoever finds the text owns the knowledge of how to put it back. This is the change that makes format
support open on both ends.
*Cost, stated:* a closure hides *where* the write lands, which is worse for debugging than an explicit
path. Mitigated by ADR-3.

**ADR-3 — every target carries its `idPath`, including in the pipeline.**
Today the pipeline's chunks have no location; only the projector computes `idPath`. Carrying it on
every target restores the debuggability the closure costs, and gives logging and provenance a location
for free.

**ADR-4 — an unmatched selected leaf is reported, not skipped.**
`onUnhandled` closes defect §4.1 of the 2026-07-31 report (unrecognized rich-text format silently
copied through untranslated) at its structural root: the writer becomes as open as the expander array,
and "no extractor matched" stops being indistinguishable from "nothing to translate".

**ADR-5 — selection inside a rich-text embedded block uses the same rule as everywhere else:
`localized: true` on the leaf, minus `custom.translateKit` exclusion.** No scoping, no special case.

An earlier draft dropped the `localized` requirement inside a block, reasoning that the flag is inert
there — a block inside a `richText` value has no per-locale columns of its own. That reasoning rested on
a category error, and it manufactured a problem: selecting *every* text leaf inside a block would
translate service values nobody marked — an icon name (`"arrow-right"`), a style variant, an anchor id, a
code fragment — and break the consumer's rendering on a minor upgrade. It also forced a compatibility
flag into existence.

**The category error: `FieldLike.localized` is the plugin's own property, not a mirror of Payload's.**
The names coincide because Payload's concrete `Field` is structurally assignable to `FieldLike` — a
naming coincidence, not a semantic dependency. What the plugin's marker means is "this leaf is a
translation target". Whether Payload also allocates a per-locale column for that leaf is Payload's
business and varies by position; the plugin's question does not vary. So there is nothing to
reinterpret inside a block: the Payload language reads its source signal (`field.localized`) the same
way at any depth.

Today's code writes the confusion down explicitly: `translatableLeaf.ts` annotates its predicate
`/** Mirrors isLocalizedField structurally. */`. That comment should say what is actually true — the
plugin's own target marker, which the Payload adapter happens to source from `field.localized`.

**Naming consequence.** In the language contract the marker should not be called `localized` at all
(`translate` or `isTarget` reads correctly), so nobody infers parity with Payload's flag again. The
Payload language maps `field.localized` onto it; another host maps whatever it has.

Schema authors already write the signal where they mean it: in `apps/cms`, `CtaBannerInlineBlock`'s
`eyebrow` / `heading` / `description` carry `localized: true` while `icon`-style fields do not.

Consequences, all of them good:

- **Nothing a consumer did not mark is ever sent to the provider.** No config flag, no opt-out sweep.
- **The fingerprint change narrows to honest staleness.** A document's hash moves only if a marked block
  leaf holds text — and for those documents "stale" is true, because that text has no translation in the
  target locale. Fingerprint versioning (§7) drops from a hard gate to bookkeeping.
- **One rule to document** instead of two.

One asymmetry to write down in the README so nobody re-litigates it — and it is Payload's asymmetry, not
the plugin's rule: writing `localized: true` on a top-level leaf both marks it for translation *and*
gives it per-locale storage; writing it on a leaf inside an embedded block only marks it, because that
leaf lives inside a single localized `richText` value. The plugin asks the same question in both places
and gets the same answer.

The selection port stays injectable (`selects` on the language, `select` from the host), so exposing a
consumer-level predicate in `TranslatorPluginConfig` later is possible — but two schema signals are
enough here, and an unused extension point is not worth opening.

**ADR-6 — "is this value empty" is asked of the extractor, not re-derived by the strategy.**
`SkipExistingStrategy` currently decides emptiness itself, and for rich text it does so by sniffing the
value's shape (`isSerializedLexicalRoot(value)` → `isEmptyRichText`). That is format knowledge behind
the wrong port: adding a format would still mean editing a strategy. The `Extractor` gains `isEmpty`,
and `shouldTranslate` receives the matching extractor's verdict instead of guessing from the value.
*Behavior note:* duck-typing the value and reading `field.type` agree on every case in the current test
suite, but they differ on a malformed value under a `richText` field — schema-based dispatch then routes
it to the rich-text extractor, which reports it through `onUnhandled` (ADR-4) instead of silently
treating it as non-empty plain data. That is the intended direction, and phase 3 must cover it with a
test.

**ADR-13 — a container's `localized` never widens selection. The rule stays leaf-explicit, and the gap
between that and Payload's mental model is closed by documentation, not by a runtime warning.**

Payload's `localized` on a group / array / blocks / tab means "this subtree is stored per locale". The
plugin's marker means "this leaf holds prose to translate". Two properties that often coincide and are
not the same one (ADR-5). Inheriting the container's flag into selection would:

- translate service values that live inside localized subtrees — `icon: "arrow-right"`,
  `variant: "primary"`, `anchorId: "pricing"` — the exact failure mode ADR-5 rejected one level down;
- make the target set depend on ancestry, so toggling a container's `localized` for unrelated reasons
  silently changes what gets translated and moves every fingerprint in that collection;
- flip the default direction of risk from "translate nothing unless asked" to "translate everything
  unless forbidden", which is the wrong default for a tool that rewrites production content.

**Rejected — a config-time warning** listing unmarked text leaves under a localized container. It fires
on a *legitimate* schema choice, cannot be silenced except by adding `exclude` marks purely to quiet a
log, and would train authors to annotate for the checker rather than for meaning. The line this draws:
the plugin reports when it **could not do what the schema asked** (`onUnhandled`, ADR-4); it never
reports what the schema **chose not to ask for**.

**Rejected — a global `inheritLocalized` option.** One switch that changes the meaning of every schema
at once; `2026-07-29-config-combination-rules.md` exists because such switches multiply.

**Deferred — an explicit subtree marker**, if the ergonomics of a twenty-field localized group ever
justify it: `withFieldTranslation(container, { translate: "subtree" })`, written into
`custom.translateKit`. Per-container, composes with `exclude` for the exceptions, and stays the
plugin's own property rather than a reinterpretation of Payload's. Not now.

**Must be written into the code, not just here.** `DataReconciler` already reads an ancestor's
`localized` — `sharedRow: cursor.sharedRow && !field.localized` — to decide whether an array/block row's
`id` survives. That is **storage**, not selection, and the asymmetry is deliberate. It needs a comment
at that line, because it lives in the file where "aligning the inconsistency" wipes other locales'
content.

### 4.5 Traversal languages and where their boundaries are

**Terminology, because one word was doing two jobs.** *Node kind* answers "what shape of data sits
here" — there are three, and they are what the traversal engine dispatches on. *Language boundary* is
a separate thing: a property of a **value** node saying "my content is described by another language"
(§ Boundary detection). Below, "boundary" always means the language one.

### The vocabulary generalizes to three node kinds plus two flags

These are a way to *talk* about structure; in code they are the shape `step` returns (§4.2), not an
enum the kernel switches on.

`classifyField` today names Payload concepts (`group` / `array` / `blocks` / `tabs` / `row` /
`collapsible` / `ui`) although every distinction it draws is structural. Collapsed:

| Payload name | Generic node |
| --- | --- |
| `group`, named tab | kind **object** — descend into `data[key]` as one object |
| `array` | kind **list** — one child schema for every element |
| `blocks` | kind **list**, with `resolveChildren(item)` — child schema chosen per element |
| `text`, `textarea`, `number`, `richText`, … | kind **value** — no descent; content lives here |
| `row`, `collapsible`, unnamed group, unnamed tab | flag `opensBoundary: false` — has children, has no key of its own, so children are walked in the parent's data scope |
| `ui` | the degenerate case of that flag: no children **and** no data level — needs no kind of its own |

`array` vs `blocks` is deliberately **not** two kinds: it is one kind with a resolver, which is what
lets a host with polymorphic containers plug in without a new concept.

What does *not* generalize away: the schema is still required to know what to translate. JS shape
cannot tell a group's object from a list element, nor a title from a slug. The kernel loses Payload's
*names*, not the need for a schema.

**ADR-7 — the kernel is generic over the host's node type; it does not carry host fields, and it does
not need a node type of its own.** An earlier draft had `Node<TRaw> = { kind, key, opensBoundary, raw }`
— a generic node carrying the host's schema node in a `raw` field the kernel promised not to read. The
`step`-based contract (§4.2) makes both halves unnecessary:

- **Kinds** are the shape of what `step` returns, so no `kind` field exists to keep honest.
- **`raw` is redundant**, because the engine is generic over the node type `N` and hands the host's own
  node straight back to the host's visitor. `DataReconciler`'s `sharedRow` rule reads
  `field.localized` off a `FieldLike` directly — no cast, no envelope.

The principle from that draft survives intact: the kernel cannot read a host concept. The mechanism is
now "generic over `N`" instead of "carry an envelope", which is one concept fewer.

A consequence worth stating, because it removes a port: **element pairing across locales stops being a
kernel concern.** Building a child cursor for a list element is `step`'s job, so the Payload language's
cursor does the `id`-matching internally (today's `matchElementById`). There is no `pairElement` port in
the kernel signature — the convention lives with the language that has the convention.

### Boundary detection — declared, not sniffed

The kernel holds a registry of traversal languages and switches between them mid-walk, because the
nesting is real: Payload fields → Lexical nodes → Payload fields, unbounded.

**ADR-8 — a boundary is declared by the language being left, in priority order:**

1. **On a schema node of the outer language.** A Payload `richText` node is described not as a value
   but as "a value of language `lexical`". Detection is a registry lookup, not a guess.
2. **On a node kind inside a language.** The Lexical language declares `block` / `inlineBlock` as
   re-entry points into whatever language handed it its context.
3. **Fallback: a claim on the value** (`claims(value)`), for a host that cannot declare. Exactly one
   language must claim; **zero claimants is a reported error** (ADR-4), two is a registration-time
   configuration error. Kept to a minimum on purpose: Lexical, Slate and ProseMirror are near-identical
   in shape (`{ type, children }`), and guessing between them means silently mistranslating.

**ADR-9 — crossing a boundary carries an explicit context object, and the handoff is one-way.**
"Switch language" alone is not enough. A `block` node's field list depends on `node.fields.blockType`
resolved against the block definitions in the *outer* field's editor config
(`field.editor` → `BlocksFeature({ blocks, inlineBlocks })` — two lookups, keyed by node type). So when
the Payload language hands a value to the Lexical language, it hands along the resolvers; the Lexical
language knows only that it was given a function from a string to a child schema, and never learns a
Payload type. Two supporting invariants:

- **A boundary always sits on a leaf of the outer language.** No language may descend into another's
  interior — that keeps "which language am I in" a stack rather than a deduction.
- **Cycle and depth guard.** `Payload → Lexical → Payload → …` is legal and unbounded (a block holding
  a rich-text field holding a block). Needs a depth cap plus a visited guard on the schema registry,
  like the recursive-registry guard the 2026-07-31 probe needed.

**ADR-10 — paths cross boundaries.** `idPath` must stay addressable *inside* an embedded block,
otherwise provenance cannot say which leaf drifted and the fingerprint cannot be compared per leaf.
Each language emits path segments for its own nodes (Payload: field name + element id; Lexical: node
index), and the handoff carries the accumulated segments. This is a phase-5 acceptance criterion, not
an afterthought: it is also what makes the fingerprint change in that phase explainable rather than
opaque.

### Two shapes of language — and what the engine must give up

Languages come in two constructions, and the engine has to serve both:

| | **Schema-outside** | **Self-describing** |
| --- | --- | --- |
| Structure lives in | a schema tree parallel to the data | the data itself — each node carries its own `type` |
| `TRaw` is | a schema node | a data node |
| Examples | Payload fields, a Storyblok component registry | Lexical, ProseMirror, Slate |

This is the real reason today's `walkFields` cannot host a rich-text structure, and it is not naming:
the engine **assumes schema and data are two trees** and indexes one into the other by key. A generic
engine must allow `TRaw` to *be* the data, with the language deciding what a node is. Dropping that
assumption — not renaming `group` to `object` — is the substance of phase 6.

**ADR-11 — the kernel ships zero languages.** It ships the `TraversalLanguage` contract, the registry,
the crossing protocol, target assembly and paths. Both the Payload language and the Payload-flavoured
rich-text language are registered by the plugin.

Rationale, in order of weight:

1. **The rich-text language we need is not neutral.** The nodes the embedded-block defect turns on —
   `block` and `inlineBlock` — are **Payload's** additions via `BlocksFeature` in
   `@payloadcms/richtext-lexical`; vanilla Lexical has no such node types. What today's
   `core/kernel/lexical` handles (`root` / `children` / `type: "text"`) is the neutral part, and it is
   precisely the part that is not enough.
2. **Zero built-ins is the only proof the extension point is complete.** A language living inside the
   kernel can reach internals the published contract does not expose, and then nobody outside can write
   a second one. Shipping none forces the contract to be sufficient.
3. **Version coupling.** Serialized node shapes track someone else's editor releases; the kernel would
   have to follow that schedule.

A plain string is **not** a language: it is a `value` leaf, and the text is read by whichever language
owns that leaf.

One thing this simplifies: selection belongs to a language plus the context it was entered with, so the
Payload language applies its one rule (`localized: true` minus exclusion) at document scope and at
re-entry alike — see ADR-5, which deliberately keeps that rule uniform rather than scoping it.

### 4.6 The package boundary

The core becomes a **published** package the plugin depends on like any third-party dependency.

**Published, not private — this is forced, not preferred.** The June slice-7 analysis
(`2026-06-30-slice7-translator-core-package-design.md`) established why: the plugin is published to npm
and built with swc per-file transpile with **no bundling**, so a `workspace:*` dependency on a private
package would leave an unresolvable `import … from "@repo/translator-core"` in the published `dist`
(a 404 for every consumer). Bundling the core in was rejected because the plugin exposes **per-file
client component paths** (`exports["./client/*"] → dist/client/*.js`) that Payload's importMap
references, and bundling breaks those. That leaves publishing the core as the only shape that works —
which is also what makes the boundary real: with no `payload` dependency installed at all, a framework
import **fails to resolve** instead of failing a lint rule.

| Moves to the package | Stays in the plugin (the adapter) |
| --- | --- |
| `src/core/kernel/**` (traversal engine, generic kinds, language registry, crossing protocol) | `src/server/**`, `src/client/**`, `src/composition/**` |
| `src/core/domain/**` (selection, projection, provenance + provider ports, locales) | `src/translation-providers/**` (the OpenAI implementation) |
| `src/core/translation-pipeline/**` (primitive, stages, strategies) | `DataReconciler` **stays** — it is Payload storage policy (§3) |
| — | **The Payload language** and **the Payload-flavoured rich-text language**, both registered at wiring time (ADR-11). `core/kernel/lexical` moves *out* of the kernel with them |
| | The block-definition resolver built from `field.editor` → `BlocksFeature` |

Publishing plumbing this repo already requires (root `CLAUDE.md`): `"private": false` +
`publishConfig.access: "public"`; `repository.url` exactly
`https://github.com/focusreactive/payload-plugins` or semantic-release fails with a git 128; **npm
Trusted Publishing configured for the new package name** before the first CI publish, else
`verifyConditions` fails with `ENONPMTOKEN`. The repo has a skill for adding a package, including the
"cannot publish over previously published versions" first-publish trap.

### 4.7 Implementation sketch — how an external language is passed in and driven

Pseudocode, close enough to the real thing to argue about. The point to check while reading: the kernel
half never names Payload, Lexical, or any data key.

#### The engine (kernel)

```ts
function walk(reg, langId, nodes, cursor, visit, path, depth) {
  if (depth > reg.maxDepth) throw new NestingTooDeep(path);
  const lang = reg.get(langId);

  for (const node of nodes) {
    const step = lang.step(node, cursor);              // the only data access in the system
    if (step.kind === "skip") continue;

    if (step.kind === "children") {
      for (const child of step.items)
        walk(reg, langId, child.nodes, child.cursor, visit, [...path, child.segment], depth);
      continue;
    }
    visit.leaf({ lang, langId, node, cursor, step, path: [...path, step.segment], depth, reg });
  }
}

/** One activation path for the root and for every crossing alike (ADR-12). */
function activate(reg, crossing, value, visit, path, depth) {
  const lang = reg.get(crossing.language);
  const { nodes, cursor } = lang.enter({ value, context: crossing.context });
  walk(reg, crossing.language, nodes, cursor, visit, path, depth);
}
```

#### The collector (kernel) — where a crossing happens

```ts
function collectTranslationTargets({ languages, entry, select, onUnhandled, maxDepth }) {
  const reg = registry(languages, maxDepth);
  const targets: TranslationTarget[] = [];

  const visit = {
    leaf({ lang, node, cursor, step, path, depth, reg }) {
      const crossing = lang.boundary?.(node, cursor, step.value);
      if (crossing) {
        activate(reg, crossing, step.value, visit, path, depth + 1);   // ← Payload → rich text → Payload
        return;
      }
      if (!lang.selects(node, cursor)) return;                          // the language's own rule
      if (select && !select({ node, cursor, value: step.value })) return; // host policy on top
      if (lang.isEmpty(step.value)) return;

      const units = lang.textUnits(step);
      if (units.length === 0) { onUnhandled?.(makeIdPath(path), step.value); return; }
      for (const u of units)
        targets.push({ idPath: makeIdPath(path), text: u.text, write: u.write });
    },
  };

  activate(reg, entry, undefined, visit, [], 0);
  return targets;
}
```

#### The Payload language (plugin) — schema outside

```ts
const payloadLanguage: Language<FieldLike, PayloadCursor> = {
  id: "payload",

  enter({ context }: { context: { fields: FieldLike[]; data: object } }) {
    return { nodes: context.fields, cursor: makeCursor(context.data) };
  },

  step(field, c) {
    if (isTransparent(field))                        // row, collapsible, unnamed group/tab
      return { kind: "children", items: [{ nodes: field.fields, cursor: c, segment: NONE }] };
    if (field.type === "ui") return { kind: "skip" };
    if (field.type === "group")
      return { kind: "children",
               items: [{ nodes: field.fields, cursor: c.into(field.name), segment: key(field.name) }] };

    if (field.type === "array" || field.type === "blocks") {
      const arr = c.read(field.name) ?? [];
      return { kind: "children", items: arr.flatMap((item, i) => {
        const fields = field.type === "blocks" ? resolveBlockFields(field, item) : field.fields;
        // c.element() also pairs the target-locale counterpart by id — the convention lives here
        return fields ? [{ nodes: fields, cursor: c.element(field.name, i, item),
                           segment: elementSegment(item, i) }] : [];
      })};
    }

    return { kind: "value", value: c.read(field.name), segment: key(field.name),
             setValue: (v) => c.write(field.name, v) };
  },

  selects: (field, c) =>
    isTranslatableType(field) &&
    field.localized === true &&        // Payload's flag mapped onto the plugin's target marker;
                                      // same question at any depth (ADR-5)
    !isExcluded(field),

  isEmpty: (v) => (typeof v === "string" ? v.trim() === "" : v == null),

  textUnits: ({ value, setValue }) =>
    typeof value === "string" && value.trim() ? [{ text: value, write: setValue! }] : [],

  boundary(field) {
    if (field.type !== "richText") return null;
    const blocks = readBlocksFeature(field.editor);        // BlocksFeature — Payload knowledge, here
    return { language: "rich-text",
             context: { resolveBlock: (node) => blocks[node.fields.blockType] ?? null } };
  },
};
```

#### The rich-text language (plugin) — self-describing

```ts
const richTextLanguage: Language<LexNode, { resolveBlock: Resolver }> = {
  id: "rich-text",

  enter({ value, context }) { return { nodes: [value.root], cursor: context }; },

  step(node, c) {
    if (node.type === "text")
      return { kind: "value", value: node.text, segment: NONE,
               setValue: (t) => { node.text = t as string; } };        // mutates the node itself
    if (node.type === "block" || node.type === "inlineBlock")
      return { kind: "value", value: node, segment: blockSegment(node) };  // a boundary, see below
    if (Array.isArray(node.children))
      return { kind: "children",
               items: node.children.map((ch, i) => ({ nodes: [ch], cursor: c, segment: index(i) })) };
    return { kind: "skip" };
  },

  selects: () => true,        // inside rich text there is nothing to select on
  isEmpty: (v) => (typeof v === "string" ? !v.trim() : false),
  textUnits: ({ value, setValue }) =>
    typeof value === "string" && value.trim() ? [{ text: value, write: setValue! }] : [],

  boundary(node, c) {
    if (node.type !== "block" && node.type !== "inlineBlock") return null;
    const fields = c.resolveBlock(node);                   // resolver arrived with the crossing
    if (!fields) return null;                              // unknown block → onUnhandled
    return { language: "payload", context: { fields, data: node.fields } };
  },
};
```

#### Wiring (plugin)

```ts
const targets = collectTranslationTargets({
  languages: [payloadLanguage, richTextLanguage],
  entry: { language: "payload", context: { fields: schema, data: filteredData } },
  select: ({ value, cursor }) => strategy.shouldTranslate({ sourceValue: value, targetValue: cursor.targetOf() }),
  onUnhandled: (idPath, value) => payload.logger.warn({ idPath, msg: "untranslated value passed through" }),
  maxDepth: 8,
});

const translations = await provider.translate(toWire(targets), sourceLng, targetLng);
applyTranslations(targets, translations);
```

#### One trace, `Posts.content` with a CTA banner

```
payload    step(content: richText)  → value
           boundary(content)        → { rich-text, { resolveBlock } }
rich-text  enter(value)             → nodes: [root]
           step(root)               → children: [paragraph, block]
           step(paragraph)          → children: [text]
           step(text)               → value "Hello"      → TARGET, write: node.text = …
           step(block)              → value (the node itself)
           boundary(block)          → { payload, { fields: [heading, description],
                                                   data: node.fields } }
payload    enter(...)               → nodes: [heading, description]
           step(heading)            → value "Click me"   → TARGET, write: node.fields.heading = …
```

The blind spot closes, and at no step did the kernel know whose nodes these were.

#### Why the reconciler does not cross

`boundary` is consulted by the **visitor**, not by the engine. The target collector asks and crosses;
`DataReconciler`'s visitor never asks, so a rich-text value stays an opaque leaf and is copied whole —
exactly today's behavior, preserved by omission rather than by a special case.

## 5. Why this is worth doing

Neither reason is portability. Both are internal, and both are blocked today by the same structure.

### 5.1 It is the only sane way to fix the embedded-block defect

There are two traversals and they cannot meet. The schema walk stops at a `richText` leaf and treats
its value as opaque. The Lexical walk (`collectTextNodes.ts:8-23`) descends only through `children`
and collects only `{ type: "text" }` — but Payload's `block` / `inlineBlock` nodes are *leaf* nodes
whose content lives under `fields`. Result: text inside a block inserted into a rich-text field is
never translated, silently. Confirmed in this repo's own `apps/cms`
(`Posts.content` + `CtaBannerInlineBlock` with `heading` / `description`).

The `descend` callback in §4.2 is exactly the seam where the two walks meet: the extractor handling a
`block` node calls back into the schema walk with that block's field definitions and `node.fields` as
data. There is no cheaper fix — a patch inside `collectTextNodes` cannot work, because that function
has no schema and the block's fields are only knowable from `BlocksFeature` in the editor config
(the adapter must supply them).

### 5.2 It makes the fix reach the fingerprint too — the second half of that defect

The fingerprint is blind to embedded blocks for the same reason: `leafSourceText` joins the nodes that
`collectSerializedLexicalTextNodes` finds, and it finds none inside a block. So editing only the text
inside an embedded block leaves the fingerprint unchanged — auto-translate does not fire, and the
"stale translation" badge never appears.

This matters for scoping, not just tidiness. Fix only the pipeline and the outcome is **worse than
today**: embedded-block text starts getting translated on a manual run, so the feature looks like it
works, while edits to that same text still register as "source unchanged". The half-working version is
the one people trust.

With the language shared, phase 5 lands in both consumers at once — the translator and the fingerprint
ask the same language what text a value holds, so they cannot disagree about embedded blocks or about
any format added later. That is the whole reason the fingerprint is in scope here: its *hashing* and
storage stay exactly where they are (`fingerprinter.ts`, the provenance sidecar, the server
orchestration), and only its source of text is unified.

This subsumes items 1 and 3 of the 2026-07-31 hygiene list (typed error for unhandled formats; one
translatable-type vocabulary), and makes item 4 (complete the public barrel) trivially reachable.

### 5.3 The package and the generalization now have internal drivers

The July verdict rejected L2 because its only argument was a second CMS product that does not exist.
Two arguments that do not depend on that product have since appeared, which is why the owner's
direction is not a reversal of the reasoning but a change in its inputs:

- **The nesting requires a language registry.** `Payload → Lexical → Payload` cannot be expressed by a
  traversal whose vocabulary *is* one of the two languages. The embedded-block defect is not "teach the
  kernel Lexical" — it is "let the kernel hold several traversal languages and cross between them"
  (§4.5). Generic kinds are the precondition, not the goal.
- **The package makes the boundary enforceable instead of agreed.** Today `src/core` is payload-free by
  a lint rule plus a scanning test, both of which pass a type that leaks through a return value. With
  the core installed as a package that has no `payload` dependency, the leak becomes a resolution
  error. That is worth having independently of who else consumes it.

The public barrel (hygiene item 4) stops being optional here: a package's exports *are* its API, so
the deep imports counted on 2026-08-21 (`kernel/utils/isObject` from 5 sites, `translation-pipeline/
strategies` from 3, `kernel/lexical` from 2) must be resolved into real exports before the split, or
they become either public API by accident or broken imports.

## 6. Build sequence

Each phase is one PR, green on its own: `bun run build`, core tests, `no-payload-boundary`, the
`apps/dev` translator integration suite, `check-types`, and lint.

| # | Phase | Size | Behavior |
| --- | --- | --- | --- |
| 0 | Parity test tying `isTranslatableFieldType` (`translatableLeaf.ts:17`) to `isTranslatableField` (`server/shared/guards/field-guards.ts:12`) | XS | none |
| 1 | `TextChunk` union → `TranslationTarget` with `write()`; `TranslationMutator` collapses; Lexical import leaves the pipeline contract | S | none |
| 2 | Introduce `collectTranslationTargets` in `core/kernel/translation-targets/`; port the pipeline's collector onto it; `matchElementById` moves out of `kernel/` toward the Payload language | M | none |
| 3 | Point `leafSourceText` at the same text-extraction code the pipeline uses (joining a leaf's units); the projection keeps its own walk; add `onUnhandled` reporting (ADR-4); **complete the public barrel** and kill the deep imports (§5.3) | S–M | unhandled structure now reported instead of silent; **fingerprint values unchanged** |
| 4 | **Package split** — `src/core` → `packages/translator-core`, publishing plumbing, plugin becomes a consumer of the published package (§4.6) | M | none — pure move + wiring |
| 5 | **Language registry + crossing protocol** (ADR-8…11) in the kernel; the plugin registers the Payload language and the Payload-flavoured rich-text language and supplies block definitions from `field.editor` | M | **translation and fingerprint both gain embedded blocks**; fingerprint migration |
| 6 | **Vocabulary generalization** — the engine becomes generic over the node type and drives `step` (ADR-7, §4.7), so it stops assuming schema and data are separate trees and a self-describing language can be walked at all | M–L | none |

Phase 0 is listed first because phases 2–3 route both consumers through one shared vocabulary, and an
untested hand-mirrored list is exactly the thing that makes that silently wrong.

**On the 4-before-5 order.** They are independent, so this is a preference, not a dependency. Splitting
first means the boundary mechanism is designed as package API from the start instead of retrofitted,
and it de-risks the publishing plumbing while the core's surface is still small. The counter-argument is
real: the user-visible defect fix (phase 5) then sits behind an infrastructure step. **If the first
publish hits friction — trusted publishing, the first-publish version trap — do phase 5 in-plugin and
split afterwards.** Do not let a packaging problem hold the fix.

**On the 5-before-6 order.** The generalization is easier once the registry exists, because the registry
is what forces the vocabulary to be a *contract* rather than a rename: with two languages registered,
any Payload notion left in the generic node shows up immediately as a thing the Lexical language cannot
supply. Generalizing first would mean guessing which distinctions matter.

Phase 6 will break the core package's API. That is deliberate and cheap: the package is pre-1.0 and has
exactly one consumer, so the cost is a version bump — but it is the reason not to publicize the package
to anyone else before phase 6 lands.

### Acceptance criteria

- **Phases 1–3:** no change to `src/index.ts`; every existing core test unchanged and green (33 files /
  425 cases in `core` alone) plus the integration suite; `TranslationMutator` contains no format
  branch; `types/` under `translation-pipeline` imports nothing from `kernel/lexical`; exactly one
  module answers "what text is inside this value" for every consumer.
- **Phase 3 additionally:** a test proving a leaf whose value no extractor recognizes is reported
  through `onUnhandled` and not written through untranslated; and a test pinning that the fingerprint
  of an unchanged fixture is byte-identical before and after the phase.
- **Phase 4 (split):** the published plugin installs and runs from a clean registry install (not just
  from the workspace) — verified with a packed tarball, since a hoisted workspace hides exactly the
  resolution bug this phase can introduce; the core package has **no** `payload` / `@payloadcms`
  dependency of any kind; `src/index.ts` of the plugin re-exports the same public API as before.
- **Phase 5 (boundaries):** integration test — a document with `richText` containing a block whose
  text fields carry `localized: true` translates those fields, **and a sibling field in the same
  block without `localized` stays untouched** (ADR-5); a second test — editing only text inside that block changes the source
  fingerprint; a third — a leaf whose `idPath` lies *inside* an embedded block is addressable in
  provenance (ADR-10); a fourth — `Payload → Lexical → Payload → Lexical` nesting terminates and is
  capped rather than recursing forever (ADR-9).
- **Phase 6 (generalization):** the kernel contains no occurrence of `group` / `array` / `blocks` /
  `tabs` / `row` / `collapsible` / `ui` / `richText` / `localized` / `blockType`, and **no language of
  its own** (ADR-11); a self-describing language (structure carried by the data) can be registered and
  walked, proven by a test language written against the published contract only; `DataReconciler`'s
  `sharedRow` rule still reads `field.localized` directly off its own node type and its existing tests
  are unchanged.

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| A write closure hides where the mutation lands, making failures harder to trace than an explicit path | ADR-3: every target carries `idPath`; log it on write in dev builds |
| Unified selection must keep `skip_existing` exact — it reads the target value of the *id-matched* element, not the positional one | The Payload language's cursor carries all three trees and does the id-matching where it builds an element's child cursor (ADR-7); phase 2 lands with the existing collector tests unchanged |
| Phase 2 touches the walk that `sharedRow` logic is nested in — the data-loss-critical area | `DataReconciler` is not touched at all (§3); the reconcile walk stays a separate walker |
| **Phase 5 changes fingerprint values — but only where new translatable text actually appeared.** Under ADR-5 a hash moves only if a leaf marked `localized: true` inside an embedded block holds text, and for those documents "stale" is the truth: that text has no translation in the target locale | Version the fingerprint (`fingerprintVersion` on the provenance record) for auditability, and treat a version mismatch as "unknown" rather than "stale". No longer a release gate — the blast radius is documents that genuinely gained content, not the whole store |
| A later "tidy-up" merges the two walks into one pass, because after this refactor they look redundant — and hashes the already-translated targets, making every fresh translation read as stale | §3 records the ordering as a binding non-goal with the reason; keep a test that fingerprints the source *after* a translation run and asserts the record is not stale |
| Scope creep into L3 — someone "finishes the job" by lifting `sharedRow` out too | §3 keeps L3 out explicitly. The generalization is about the traversal *vocabulary*; the locale storage model is not part of it and has no internal driver |
| **The split breaks the published plugin in a way the workspace hides.** `bunfig.toml` uses a hoisted linker and the plugin is transpiled per-file with no bundling, so an import that resolves locally can still 404 for consumers | Phase-4 acceptance requires a clean install from a packed tarball, not a workspace run; verify `dist` contains no unresolvable specifier before the release |
| Release coupling — a core fix now needs a core release *and* a dependent plugin bump | multi-semantic-release handles cross-dependency bumps, but verify with `bun run multi-semantic-release --dry-run` before phase 4 merges, not after |
| `fingerprinter.ts` depends on `node:crypto`, which pins the published core to Node runtimes | Open question in §9 — inject a hash function as a port, or declare Node engines and accept it |
| Phase 6 churns the core's public API right after it is first published | Deliberate (§6): pre-1.0, one consumer. Do not advertise the package outside this repo until phase 6 lands |

## 8. Rejected alternatives

- **Leaving the vocabulary Payload-shaped (the July verdict's option B).** Superseded on 2026-08-21:
  the drivers changed, not the reasoning (§5.3). What the July analysis actually killed was L3 and the
  *portability* argument for L2 — both of which still hold: the reason to generalize is the language
  registry and the package boundary, not a hypothetical second CMS.
- **A private `@repo/translator-core` bundled into the plugin.** Ruled out in June on hard grounds
  (§4.6): no bundling in the plugin's build, and bundling would break the per-file client component
  paths the Payload importMap needs.
- **Genericizing `DataReconciler` / lifting `sharedRow` as policy.** Highest-risk code in the package,
  no internal payoff.
- **Porting the fingerprint projection onto the primitive as well (one walk, two consumers).** Was the
  first shape of this design; narrowed on review. It buys deduplication of two ~50-line walkers and
  costs the ordering guarantee of §3 plus a fingerprint-value migration in phase 3 instead of phase 4.
  The payoff (a per-format fix reaching both consumers) comes from the shared extractor, not from the
  shared walk, so the extra scope bought nothing the narrow version does not already deliver.
- **Patching `collectTextNodes` to handle embedded blocks directly.** Impossible without the schema —
  and even if forced, it would have to be repeated in the fingerprint path, re-creating the drift this
  design removes.
- **Keeping the union and adding a third member for embedded blocks.** Each new format would keep
  touching `TranslationMutator`; the asymmetry of §2 survives.

## 9. Open questions (owner decisions needed before phase 4)

1. **Package name.** `@focus-reactive/translator-core` is the obvious fit for the existing npm scope.
   Alternatives worth a moment: a name that does not say "translator" if the traversal engine is the
   reusable part (`@focus-reactive/schema-walk`), since after phase 6 the package is a multi-language
   schema traversal engine that happens to ship translation on top.
2. **`node:crypto`.** Keep it and declare Node engines, or make hashing an injected port so the core
   runs in any runtime? Injecting is ~10 lines and removes the only built-in dependency the core has.
3. **Does the fingerprint hashing belong in the core at all?** It is `computeSourceFingerprint` =
   projection + hash. The projection clearly belongs; the hash is arguably plugin-side policy. Deciding
   this also decides question 2.
4. **Release verification.** Confirm the cross-package bump flow with a dry run before the split lands
   (§7), and confirm npm Trusted Publishing is configured for the new name.

## 10. Compatibility and limitations

### What consumers cannot be broken by, and why

Two facts bound the blast radius of everything in §6:

1. **The exports map allows two paths only** — `"."` → `dist/index.js` and `"./client/*"` →
   `dist/client/*.js`. `@focus-reactive/payload-plugin-translator/dist/core/...` does not resolve, so no
   consumer can be deep-importing the code this design moves.
2. **`src/index.ts` exports none of it.** The public barrel is `translatorPlugin` +
   `TranslatorPluginConfig`, `TranslationTask` / `TranslationLifecycleCallbacks`,
   `TranslationProvenanceRecord`, `AccessGuard` / `AccessGuardRequest`, `TranslationProvider` /
   `TranslationInput` / `TranslationOutput`, `createOpenAIProvider` (+ `OpenAIProviderConfig`,
   `DryRunConfig`), `createPayloadJobsRunner` / `createSyncRunner`, `documentLevel` / `collectionLevel` /
   `fieldLevel`, `withFieldTranslation`, `withAutoTranslate`, plus the deprecated aliases. Absent:
   `translateContent`, `TranslationStrategy`, `TextExpander`, `FieldLike`, `walkFields`,
   `computeSourceFingerprint`. Strategies reach consumers as the strings `'overwrite'` /
   `'skip_existing'`, not as an interface to implement, and `textExpanders` exists only on the internal
   `TranslationPipelineOptions`.

So phases 1, 2, 3, 4 and 6 change no name a consumer can reach. Only phase 5 changes behavior.

### Phase 5 — the behavior deltas that remain

Under ADR-5 (same selection rule at any depth) the list is short:

- **Text inside embedded blocks starts being translated — but only on leaves the schema marked
  `localized: true`.** Unmarked service values (`icon`, style variant, anchor id, code fragment) are
  never sent to the provider, so a consumer's rendering cannot break on upgrade.
- **Some documents will read "stale" right after the upgrade**, and truthfully so: a marked block leaf
  holds source text that has no translation in the target locale yet. Editors who use the bulk dashboard
  will re-translate those documents — real provider spend, but spend on content they asked to translate.
- **`maxDepth` is a new failure mode.** A document nested deeper than the cap now errors where it
  previously half-worked silently. Needs a sane default and a message naming the offending `idPath`.
- **`onUnhandled` adds log volume** for hosts on a rich-text format nobody registered (Slate): the
  passthrough stays, the silence does not.

README changes required — and per ADR-13 the README is the *whole* mitigation, since nothing is emitted
at runtime:

- extend "Mark nested fields `localized: true` explicitly" to cover leaves inside embedded blocks;
- state plainly that a `localized` **container** does not imply its leaves are translated: marking is
  per leaf, at any depth;
- state Payload's asymmetry — the flag marks a leaf for translation in both places, but only at top
  level does it also give that leaf per-locale storage.

### Phase 4 — operational, not API

- A second published package appears in consumers' dependency trees: allow-listed registries, mirrors
  for air-gapped builds, vendoring and third-party `--frozen-lockfile` CI all need one update.
- Releases couple: a core fix means a core release plus a dependent bump. Only *types* cross the
  boundary (`TranslationProvider` and friends) and TypeScript is structural, so a custom provider written
  against an older shape keeps compiling.
- `dist/client/*` must not move: Payload's importMap points at those per-file paths, which is why
  bundling was rejected in June. This belongs in the phase-4 acceptance criteria as its own line,
  alongside the packed-tarball install (the hoisted linker in `bunfig.toml` hides exactly the resolution
  failures a consumer would hit).
- npm Trusted Publishing must exist for the new package name before the first CI publish, or
  `verifyConditions` fails with `ENONPMTOKEN`.

### Inherent limitations — not breakage, but the shape of what is possible

- **A target's `write` is a closure over the in-memory object graph, so targets do not survive
  serialization.** Collect-in-one-process / apply-in-another (push texts to a queue, apply later) is not
  expressible with closures. It *is* expressible by addressing with `idPath`, which is serializable, at
  the cost of a second walk plus handling "that leaf no longer exists". Note separately that a retried
  task always re-calls the provider: `TaskInput` carries `collectionSlug` / `collectionId` / `sourceLng`
  / `targetLng` / `strategy` / `publishOnTranslation` / `waitUntil` and deliberately no text.
- **Correlation with the provider rests on the numeric keys of `Record<number, string>`, and with the
  built-in provider that is a contract with a language model, not with an API.**
  `OpenAITranslationProvider` serializes the record to JSON (`{"0":"Hello","1":"Content"}`), sends it as
  the user message to Chat Completions (`gpt-4o`, `temperature: 0`, `response_format: json_object`) and
  parses the reply expecting the same keys back. A model that merges, splits, drops or renumbers entries
  misplaces translations silently. This design neither introduces nor fixes that.
- **The fingerprint stays field-level.** `leafSourceText` joins a leaf's text units into one entry, so a
  hash mismatch says "something in this leaf changed", never which node. Per-node staleness would mean
  changing the hash again, with its own migration.
- **L3 stays in the plugin.** `DataReconciler`, `sharedRow` and row-`id` retention do not move, so
  "the vocabulary is generic now" must not be read as "a second CMS product is cheap": that product still
  needs its own reconciler and storage policy.
- **`claims(value)` is weak on purpose.** Lexical, Slate and ProseMirror are near-identical in shape
  (`{ type, children }`), so anything relying on detection instead of declaration is one refactor away
  from silent mistranslation.

## 11. References

- Current mechanism: `core/translation-pipeline/` (pipeline + 5 stages), `core/kernel/field-traversal/walkFields.ts`,
  `core/kernel/lexical/collectTextNodes.ts`, `core/domain/content-projection/`
- Defects this design closes: [2026-07-31-core-agnosticism-options-and-value.md](./2026-07-31-core-agnosticism-options-and-value.md) §4.1, §4.2
- Coupling measurements: [2026-07-31-core-portability-storyblok-research.md](./2026-07-31-core-portability-storyblok-research.md) §3
- Layering rules this respects: [2026-07-17-core-layering-redesign.md](./2026-07-17-core-layering-redesign.md)
- Why the package must be published rather than private, and the move-set:
  [2026-06-30-slice7-translator-core-package-design.md](./2026-06-30-slice7-translator-core-package-design.md)
  (its "Option C — package deferred" decision is what phase 4 now supersedes)
