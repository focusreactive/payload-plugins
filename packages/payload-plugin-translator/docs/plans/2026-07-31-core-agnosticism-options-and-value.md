# Making the translator core agnostic — options, cost, and whether it is worth it

**Date:** 2026-07-31
**Status:** Research report (read-only analysis + three executable probes; no code changed).
**Question:** what would it take to make `src/core` framework-agnostic, and is there a point?
**Follows:** [2026-07-31-core-portability-storyblok-research.md](./2026-07-31-core-portability-storyblok-research.md)
**Related:** [2026-06-30-core-flexibility-and-reuse-review.md](./2026-06-30-core-flexibility-and-reuse-review.md)

---

## Verdict up front

**Do not build the ports for portability's sake.** A probe run against the *unmodified* core shows it
already translates Storyblok-shaped content end to end — component registry, `_uid`/`component`
bloks, ProseMirror rich text, field exclusion, and reorder-invariant fingerprints all work — provided
the adapter normalizes data on the way in and denormalizes on the way out. The normalization layer is
~60 lines. The equivalent ports would touch 9–15 core files and add permanent indirection to the hot
path, to buy something an adapter already gets for free.

**Do build the cheap hygiene work**, because it pays for itself with no portability argument at all.
Two real defects were confirmed along the way, both of the same class: **unsupported content is
silently copied, untranslated, into the target locale** — no error, no warning, no signal to the
caller.

---

## 1. "Agnostic" is not one thing

Three distinct properties get bundled under the word. Separating them is most of the answer.

| Level | Property | State today |
| --- | --- | --- |
| **L1 — framework-free** | no `payload` / `@payloadcms` / `next` / `react` imports | **already true**, enforced by an oxlint zone + the `no-payload-boundary` test |
| **L2 — convention-neutral** | does not assume Payload's *data* conventions (`id`, `blockType`, Lexical, `custom.translateKit`, field-type names) | **false** — this is what the ports would change |
| **L3 — model-neutral** | does not assume Payload's *storage* model (two per-locale trees, shared-row id retention) | **false** |

The core is already agnostic in the L1 sense. The open question is whether L2/L3 are worth buying —
and, crucially, whether ports are the only way to get them.

## 2. How much code is actually contaminated

Measured over the 3,025 non-test lines of `src/core`, counting code lines only (comments excluded):

| Coupling | Code lines | Files | Where the weight sits |
| --- | --- | --- | --- |
| Rich text = Lexical | 82 | 15 | `kernel/lexical/**` (6 files), `RichTextExpander`, `TextChunk`, `SkipExisting`, `translatableLeaf`, `TranslationMutator` |
| Element identity = `id` + `blockType` | 45 | 9 | `DataReconciler` (13), `idPath` (7), `field-traversal/kernel` (6), `contentProjector` (5), `FieldChunkCollector` (4) |
| Type vocabulary + exclusion key | 6 | 4 | `translatableLeaf.ts:17-21`, `field-config/**` |
| **Total** | **~133** | | **~4.4% of the core** |

The couplings are **narrow but central**: 4% of the lines, sitting on the hot path of every
translation. That is what makes them feel bigger than they are — and also what makes changing them
riskier than the line count suggests.

Safety net for any refactor: 33 test files, 425 cases in `core` alone.

## 3. The decisive experiment

Rather than argue about it, I ran the unmodified core against synthetic Storyblok content.

**Setup.** A component registry (`page` / `hero` / `card`) with a keyed-map schema, a story whose
bloks carry `_uid` + `component`, ProseMirror rich text with marks and a non-text image node, and one
field marked for exclusion. The adapter did three things, all outside the core:

1. mapped the component registry to `FieldLike[]` (map → array, `translatable` → `localized`,
   `richtext` → `richText`, `bloks` → `blocks` with a cycle guard on the recursive registry);
2. renamed `_uid` → `id` and `component` → `blockType` on the way in, and back on the way out;
3. transcoded ProseMirror ↔ Lexical by renaming `content` ↔ `children` and wrapping in `{ root }`.

**Result — every assertion passed:**

- top-level and nested blok text translated;
- the excluded field left untouched;
- `_uid` and `component` restored, with no `id` / `blockType` leaking into the output;
- rich text returned as a `doc`, text nodes translated, **marks preserved**, the non-text image node
  passed through verbatim;
- `computeSourceFingerprint` reorder-invariant across `_uid`-keyed bloks, and changing on a real edit.

**What this proves.** L2 and L3 are obtainable *without touching the core*. The `sharedRow` logic —
the piece flagged as pure Payload storage specifics in the previous report — turns out to be
adapter-controllable too: it derives from `localized` on containers, so a schema mapper that marks
only leaves as localized keeps every row id, which is exactly Storyblok's requirement.

**What this does not prove** (honest limits of the probe):

- it is a synthetic fixture, not the live Management API;
- it covers folder-level translation only (two parallel trees). Field-level `__i18n__` still needs
  its own split/merge layer — but that layer is adapter work under either design;
- the ProseMirror transcoder was exercised on paragraphs, marks and one atom node, not on Storyblok's
  full node vocabulary (tables, and especially **bloks embedded inside rich text**, which the walk
  would not reach — see §4).

## 4. Two real defects found along the way

Both are independent of portability, and both are the same failure mode: **silent untranslated
passthrough**.

### 4.1 An unsupported rich-text format is copied through untranslated

`TextChunkExpander` loops its expanders and, when none matches, simply moves on. But
`FieldChunkCollector` has *already* written the source value into `filteredData`. So the field lands
in the target locale carrying source-language text, with no error and no signal.

Probe with a Payload **Slate** value (an array of nodes rather than `{ root }`):

```
title            : [de] Hello
lexical body     : [de] Lexical text
slate body text  : Slate paragraph text     ← source text, written to the German locale
```

Slate is not a declared peer dependency, so this is out of contract — but the failure is invisible
rather than loud, which is the actual problem. Any host that hands the pipeline a shape it does not
recognise gets a silently half-translated document.

### 4.2 Text inside Lexical embedded blocks is never translated

Payload's Lexical `BlocksFeature` stores block data under `fields`, not `children`.
`collectSerializedLexicalTextNodes` descends only through `children` and collects only
`{ type: "text" }`, so embedded block content is invisible to it:

```
paragraph     : [de] Normal paragraph
block.heading : Embedded heading      ← untranslated
block.label   : Click me              ← untranslated
```

This is inside the plugin's declared contract (Lexical is a peer dependency, and the README promises
"full Lexical translation, preserving formatting and structure"), it is undocumented, and it fails
silently. Storyblok has the identical shape of gap — rich text can embed bloks.

Neither defect is fixed by a codec port as such. What fixes them is the *symmetry* half of that
design: make an unhandled format or node kind a typed error instead of a no-op.

## 5. The four couplings — port vs. normalization

| Coupling | Port option | Normalization option | Verdict |
| --- | --- | --- | --- |
| Rich-text format | `ContentCodec` registry: `extractText` / `isEmpty` / `expand` / `writeBack` keyed by field type. Collapses 4 independent Lexical sites into 1. | Transcode host format ↔ Lexical shape in the adapter (~25 lines, proven). | **Normalization**, unless a second format is needed *inside* Payload |
| Element identity | `idOf` / `discriminatorOf` / `stripId`, threaded through 9 files including pure helpers (`elementSegment`, `matchElementById`). | Rename `_uid`→`id`, `component`→`blockType` in/out (~15 lines, proven). | **Normalization** — the port's threading cost is permanent, the rename is not |
| Type vocabulary + exclusion | Injectable `translatableTypes` set + `isExcluded(field)` predicate. | Adapter emits Payload-shaped `type` names and a `custom.translateKit` bag (proven). | **Normalization** for portability; but see §6 — there is a separate internal reason to touch this |
| Locale storage model | Lift `sharedRow` out of the core as policy. | Control it via how the schema mapper sets `localized` on containers (proven). | **Normalization** |

### What normalization costs

Fair treatment of the losing side:

- **An extra pair of deep passes per document.** Negligible next to the provider round-trip, but not
  free on very large documents.
- **The transcoder must be exactly invertible.** My probe's rename is; a richer one (tables, embedded
  bloks) is where bugs would live. A port moves that risk into the core, where the 425 existing tests
  can guard it.
- **It does not scale past one adapter.** With two or three non-Payload hosts, each re-implements
  normalization and they will drift. At that point the ports win outright.

So the recommendation is conditional, not absolute: **normalization is correct at 0–1 external
consumers; ports become correct at 2+.**

## 6. What is worth doing regardless

None of the following rests on a portability argument. All of it pays for itself inside Payload.

1. **Make an unhandled format a typed error, not a silent passthrough** (§4.1). The expander array is
   open but the writer is closed and silent; make the pair symmetric. `[impact: H · risk: L · effort: S]`
2. **Document or close the Lexical embedded-block gap** (§4.2). At minimum a README "known
   limitations" entry; better, extend the collector to descend into block `fields`.
   `[H · M · M]` — closing it properly is a traversal change, not a doc change.
3. **One translatable-type vocabulary with a parity test.** `isTranslatableFieldType` in
   `core/domain/content-projection/translatableLeaf.ts:17-18` and `isTranslatableField` in
   `server/shared/guards/field-guards.ts:12` are hand-mirrored today with **no test tying them
   together**. Adding a field type to one and not the other is a silent divergence waiting to happen.
   `[M · L · S]`
4. **Complete the public barrel** (review theme 1). `core/index.ts` omits `utils`, `lexical`,
   `field-config` and the concrete strategies, so even the shipped OpenAI provider deep-imports into
   core internals. Cheap, and it is the thing that would make a future extraction mechanical.
   `[M · L · S]`

Note that items 3 and 4 are exactly review themes 1 and 2 — they survive the cost/benefit cut. Themes
3–5 (codec port, strategy registry, typed stage contracts) do not, on portability grounds alone.

## 7. Options

| Option | What | Cost | Buys |
| --- | --- | --- | --- |
| **A. Nothing** | leave the core as-is | 0 | nothing; the two defects in §4 stay |
| **B. Hygiene only** *(recommended)* | §6 items 1, 3, 4 (+ decide on 2) | S | closes a live silent-corruption path and a drift risk; keeps a future extraction mechanical |
| **C. Hygiene + codec port** | B plus review theme 3 | M–L | one home for format knowledge; unlocks Slate / Markdown / Portable Text inside Payload |
| **D. Full agnosticism** | C plus identity port + locale-model lift | L | L2 + L3 by construction — which §3 shows is obtainable without it |

**Recommend B now.** Escalate to C only when a *second content format inside Payload* is actually
wanted (Slate support, or closing §4.2 properly). Escalate to D only when a second CMS product is
committed **and** a second non-Payload adapter is on the horizon — one adapter does not justify it.

### Why not D, stated plainly

The previous report sized a Storyblok product honestly: `server/` (4,520 lines) and `client/`
(4,133 lines) are not reusable, so even a perfect core removes at most about a third of that project.
Option D spends L-sized effort and a permanent complexity tax on the hot path to remove a ~60-line
adapter layer from a product that does not exist. That is the definition of speculative generality.

## 8. Risks in the recommendation

- **§4.2 may be bigger than it looks.** If clients are already using Lexical blocks with translatable
  text, they have untranslated content in production right now and do not know it. Worth checking
  before deciding whether item 2 is documentation or a fix.
- **The "2+ consumers" trigger needs an owner.** A conditional recommendation only works if someone
  re-evaluates when the condition fires; otherwise normalization quietly becomes permanent and drifts.
- **Item 1 changes behaviour.** Turning a silent passthrough into an error will surface failures that
  are currently invisible. That is the point, but it needs a deliberate rollout decision (throw vs.
  structured warning through the lifecycle callbacks) rather than a straight flip.

## 9. Open questions

1. **Lexical embedded blocks** *[blocking for item 2]* — is any consumer using `BlocksFeature` with
   translatable text inside? Determines whether §4.2 is a documentation task or a defect fix.
2. **Failure mode for item 1** *[non-blocking]* — should an unrecognised format throw, or report
   through the existing `onFailed` lifecycle callback and skip the field? Throwing is louder;
   reporting keeps a partial translation useful.
3. **Second-consumer trigger** *[non-blocking]* — who re-opens the port question, and on what signal?

## Comprehension: 9/10

The coupling surface is measured rather than estimated, and the central claim (normalization beats
ports at current scale) is backed by an executed probe rather than reasoning. The missing point is
that the probe is synthetic — it has not been run against a real Storyblok space, and the ProseMirror
transcoder has not met Storyblok's full node vocabulary.

## Suggested next step

Answer question 1, then `/sp-task` on §6 items 1, 3 and 4 — they are independent of each other and
each is small. Item 2 needs a design pass first if it turns out to be a fix rather than a doc entry.

---

## Appendix — the normalization layer, in essence

Kept here because it is the artefact worth reusing if a Storyblok adapter is ever built. Proven
working against the current core.

```ts
// ProseMirror <-> Lexical: a pure structural rename. Every key other than
// `content`/`children` is preserved, so marks and atom nodes survive the round-trip.
const pmToLexical = (doc) => {
  const walk = ({ content, ...rest }) =>
    content ? { ...rest, children: content.map(walk) } : { ...rest };
  const { type: _doc, ...docRest } = doc;
  return { root: { type: "root", ...docRest, children: (doc.content ?? []).map(walk) } };
};

const lexicalToPm = ({ root }) => {
  const walk = ({ children, ...rest }) =>
    children ? { ...rest, content: children.map(walk) } : { ...rest };
  const { children = [], type: _root, ...rootRest } = root;
  return { type: "doc", ...rootRest, content: children.map(walk) };
};
```

Identity is a plain rename in the same in/out pair: `_uid` ↔ `id`, `component` ↔ `blockType`.

Two things the probe surfaced that an adapter must handle:

- **Root metadata is dropped.** The reconciler emits only named fields for the root container, so the
  story's own `_uid` / `component` do not survive. The adapter must **merge** the translated fields
  onto the original content, not replace it.
- **Container `localized` flags are load-bearing.** Mark only leaves as `localized`; marking a `bloks`
  container localized makes the reconciler strip element ids, which for Storyblok means losing `_uid`.
```
