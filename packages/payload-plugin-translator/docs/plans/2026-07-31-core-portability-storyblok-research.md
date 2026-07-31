# Translator core portability to Storyblok — research

**Date:** 2026-07-31
**Status:** Research report (read-only analysis; no code changed).
**Question:** how tightly is `src/core` coupled to Payload's data structures, and could it back a
similar translation plugin for Storyblok?
**Related:**
[2026-06-30-core-flexibility-and-reuse-review.md](./2026-06-30-core-flexibility-and-reuse-review.md) ·
[2026-06-30-slice7-translator-core-package-design.md](./2026-06-30-slice7-translator-core-package-design.md)

---

## Short answer

The core is **not a separate package** — it is the `src/core/**` directory inside the plugin
(the 2026-06-30 "option C" decision: a standalone `@repo/translator-core` was deferred because the
plugin is published to npm, and a `workspace:*` dependency on an unpublished package would leave an
unresolvable import in the published `dist`). The boundary is nevertheless real: `core/**` contains
zero `payload` / `@payloadcms/*` imports, enforced by an oxlint zone and the `no-payload-boundary`
test.

The core is coupled **not to Payload as a framework, but to Payload's data-shape conventions**.
There are six of them, of varying weight. For Storyblok:

- **ports over for free:** the `walkFields` traversal engine, the translation-provider port, the
  strategies, the pipeline orchestration, the provenance port + fingerprints, locale-set handling;
- **fixed by a schema adapter (no core changes):** the field-declaration shape, the "translatable"
  flag, the field-exclusion key;
- **requires core changes:** rich-text format (Lexical vs ProseMirror) and element identity
  (`id`/`blockType` vs `_uid`/`component`) — exactly the two ports already described in the
  2026-06-30 review as theme 3 and the deferred "identity port";
- **has no counterpart and needs its own solution:** the locale storage model. The core assumes
  "two parallel documents". Storyblok's field-level translation puts everything in one document
  under keys like `title__i18n__de`.

Size: the core is 2,958 lines out of ~11,700 (about 25% of the plugin). The `server/` layer
(4,520 lines) and `client/` layer (4,133 lines) are pure Payload and are not reusable for Storyblok
at all.

---

## Phase 1 — parsing the request

- Input type: a single spoken question, no ticket.
- Stakeholder: the developer themself; the motive is to probe whether the core can be paid back by
  a second product.
- Explicit asks: (1) assess how coupled the core is to data structures; (2) assess applicability to
  Storyblok.
- Implicit expectation: not a yes/no, but a concrete list of sites and a cost estimate.
- Inaccuracy in the input: "we made the core as a separate package" — there is no separate package,
  there is an internal directory with a hard boundary. This matters for the estimate.
- Constraint: the plugin is already published (0.10.2); the public surface must not change.

---

## Phase 2 — codebase map

### Layer sizes (excluding tests)

| Layer | Files | Lines | Portable to Storyblok |
| --- | --- | --- | --- |
| `src/core` | 67 | 2,958 | the primary candidate |
| `src/server` | 102 | 4,520 | no (Payload routes, jobs, hooks) |
| `src/client` | 129 | 4,133 | no (Payload admin components) |
| `src/composition` | 5 | 128 | no |
| `src/translation-providers` | 3 | 302 | yes, in full |
| `src/types` | 8 | 93 | partly |

### What the core is made of

- `kernel/field-traversal/**` — the schema traversal engine. `FieldLike` is a structural type
  (`{ type, name?, localized?, custom?, fields?, blocks?, tabs? }`); `walkFields` is one recursive
  pass into which the caller injects behaviour via `FieldWalker`. All four traversals in the project
  are built on it.
- `kernel/lexical/**` — locally-owned structural types for serialized Lexical
  (`{ root }`, `children[]`, `{ type: "text", text }`), plus traversal and text-node collection.
- `kernel/utils/**` — `isObject`, `isEmpty`.
- `domain/content-projection/**` — projects translatable content into a flat `{ idPath, text }` list
  plus a fingerprint (sha over `node:crypto`).
- `domain/field-config/**` — reads `field.custom.translateKit.exclude`.
- `domain/locales/**` — dedup, unknown-locale dropping, source-locale exclusion.
- `domain/provenance/**` — the provenance store contract plus the staleness rule.
- `domain/translation-providers/**` — the `TranslationProvider` port.
- `domain/auto-translate/**` — auto-translate config and the "did translatable content change" gate.
- `translation-pipeline/**` — five stages: reconcile data → collect translatable fields → expand
  into text chunks → call the provider → write translations back through references.

---

## Phase 3 — where exactly the core depends on data structure

### Axis 1 — schema declaration shape

The core reads a schema as an **array** of objects carrying `type`, `name`, `localized`, `custom`,
and the container members `fields` / `blocks` / `tabs`. Classification (`classifyField`) knows
Payload's type names: `tabs`, `group`, `array`, `blocks`, `row`, `collapsible`, `ui`.

Storyblok's component schema is a **keyed object**, `{ fieldName: { type, translatable, ... } }`,
with types drawn from a closed list (`bloks`, `text`, `textarea`, `richtext`, `markdown`, `number`,
`asset`, `section`, `tab`, `group`, …). Nested blocks are declared **not inside the field** but in a
space-level component registry; a `bloks` field at most restricts which component names are allowed.

**Conclusion:** this is solved by a pure "Storyblok components → `FieldLike[]`" mapping function; no
core changes needed. The work is mechanical: map → array, `translatable` → `localized`,
`richtext` → `richText`, `bloks` → `blocks` with definitions pulled from the registry. The subtlety
is that the registry is global and potentially recursive, so the mapper must build the schema lazily
or guard against cycles — whereas a Payload schema is finite by construction.

### Axis 2 — data-shape conventions (the hard ones)

| Convention | Payload | Storyblok | Where in the core |
| --- | --- | --- | --- |
| List element id | `id` | `_uid` | `matchElementById`, `elementSegment`, `DataReconciler` |
| Block discriminator | `blockType` | `component` | `isBlockItem`, `resolveBlockFields`, `idPath`, +4 files |
| Rich text | Lexical: `{ root, children[] }` | ProseMirror: `{ type: "doc", content[] }` | `kernel/lexical/**` + 5 consumers |
| Translatable types | `text`, `textarea`, `richText` | `text`, `textarea`, `richtext`, `markdown` | `translatableLeaf.ts:17-18` |
| Field exclusion | `custom.translateKit.exclude` | no `custom` bag, but the schema allows arbitrary keys | `domain/field-config/**` |
| "Translatable" flag | `localized: true` | `translatable: true` | `translatableLeaf.ts`, `DataReconciler` |

The first two rows require core changes — they **cannot** be hidden behind the schema mapper,
because they are the shape of the **data**, not of the schema. The other four are covered by the
mapper or by a single injected parameter.

On rich text specifically: Lexical and ProseMirror share the same idea (a node tree with text in
`{ type: "text", text }` leaves) but differ in key names (`children` vs `content`) and root wrapper
(`{ root: … }` vs `{ type: "doc" }`). So this is not a logic rewrite but lifting format knowledge
into an injectable codec — precisely theme 3 of the 2026-06-30 review. Today the Lexical knowledge
is spread across four independent sites (text extraction for the fingerprint, per-node expansion for
write-back, the emptiness check in the `skip_existing` strategy, and the `RichTextChunk` type) that
agree only by convention.

### Axis 3 — locale storage model (the heaviest)

The core takes `sourceData` and `targetData` — **two parallel trees of the same shape**, one per
locale. On top of that, `DataReconciler` carries a `sharedRow` flag encoding a Payload storage
specific: if a container and all its ancestors are not `localized`, the array row is a single DB row
with per-locale columns, and its `id` must be preserved or Payload deletes and recreates the row,
wiping the other locales. That is purely an artifact of Payload's relational storage; Storyblok has
no such thing.

Storyblok has two translation modes:

1. **Folder-level translation** — a separate story per language. Maps onto the core's model
   perfectly: two stories = two trees.
2. **Field-level translation** (`translatable: true`) — **one** story, with other languages stored
   in the same JSON under suffixed keys: `title__i18n__de`. The suffixes also appear inside nested
   bloks.

The second mode does not fit the core's model. It needs a pair of pure functions in the adapter:
"split one JSON into a source-locale view and a target-locale view" and "merge the result back,
restoring the suffixes". Technically feasible and well testable, but it is a new non-trivial concept
that exists neither in the core nor in the plugin today.

A side note: under folder-level translation, nested `_uid`s are copied along with the story, so the
two language versions start out with identical `_uid`s and then diverge independently — which is
exactly the regime `matchElementById` was designed for. The `sharedRow` logic, however, is not just
unnecessary for Storyblok but actively harmful: it strips `id` from rows under a `localized`
container, which must never happen in Storyblok under either mode.

### What ports over with zero changes

- `walkFields` / `classifyField` / `FieldWalker` — the engine knows nothing about data; the cursor
  is opaque to it.
- `TranslationProvider` (the port) and the OpenAI implementation — `{ index: string }` in, the same
  out. Entirely neutral.
- `TranslationStrategy` (`overwrite`, `skip_existing`) — except the Lexical emptiness check inside
  `SkipExisting`, which moves into the codec.
- `domain/locales/**` — plain strings and sets, zero coupling.
- `ProvenanceStore` (the port), `isRecordStale`, `fingerprint` — contracts over plain data.
- The `idPath` grammar (escaping, segment rendering) ports over; extracting `id` and `blockType`
  from an element (`elementSegment`) does not.
- Pipeline orchestration and the five-stage split.

### How much this actually buys

The core is roughly a quarter of the plugin's code. But it is the quarter where the difficulty
lives: reconciling two trees with target priority, pairing elements by identity rather than
position, stable paths and fingerprints for staleness detection, the read/write split. Everything
outside it — routes, job queue, hooks, the admin panel — gets rewritten for Storyblok, which uses a
different extension model: an external app over the Management API and webhooks, not an in-process
plugin.

Stated honestly: reusing the core removes not "25% of the work" but the most bug-prone part of it.
The overall "translation plugin for Storyblok" project shrinks by maybe a third, no more.

### Non-functional scan

- **Performance** — relevant: `walkFields` traverses the whole document, and Storyblok's component
  definitions live in a global registry, so the schema mapper must cache the registry or it will hit
  the API once per document.
- **Access & security** — relevant: under Payload, translation runs with `PayloadRequest`
  permissions; under Storyblok it runs on a Management API token scoped to the whole space. The
  permission model has to be designed from scratch. The core is not involved (it knows nothing about
  access today either).
- **Accessibility** — N/A: UI is out of scope for this research.
- **UI i18n** — N/A at this stage.
- **Observability** — relevant, but outside the core: Payload provides a logger and a job queue;
  Storyblok would need its own state and retry tracking.

---

## What it would take to make the core genuinely portable

The order matches the roadmap already agreed in the 2026-06-30 review — Storyblok simply supplies a
second consumer that justifies it.

1. **Theme 1 — a home for ports and a complete public surface.** Cheap; unblocks the rest.
2. **Theme 2 — a single translatable-type vocabulary + an injectable exclusion predicate.** Removes
   `custom.translateKit` and the hardcoded `text|textarea|richText` list from the core.
3. **Theme 3 — the content codec port.** The headline item: `extractText`, `isEmpty`, `expand`,
   `writeBack` keyed by field type, with a codec registry (Plain, Lexical, later ProseMirror). It
   also fixes an existing risk: the text used for the fingerprint and the text sent for translation
   are derived two different ways today and can diverge.
4. **The identity port** (`idOf` / `discriminatorOf` / `stripId`, or configurable key names). Marked
   "reuse-only" in the review and deferred — Storyblok moves it into the "needed" column.
5. **New, not on the roadmap:** lift the locale storage model out of the core. `sharedRow` in
   `DataReconciler` is Payload specifics living in the core. It needs either a "retain row ids"
   parameter or a full move of that policy into the adapter.

The standalone-package question (`@repo/translator-core`) changes once a second consumer appears:
today it is deferred because it would break publication, but publishing the core as a package of its
own is precisely what removes that objection (the plugin would depend on a published package rather
than on `workspace:*`).

---

## Clarifications (received 2026-07-31)

| Question | Answer |
| --- | --- |
| Purpose of this work | **Exploratory** — "is it possible in principle"; the product decision comes later |
| Target Storyblok translation mode | **Both** — folder-level and field-level |

Consequences:

- No code changes. The core roadmap stands as-is: themes 1–3 in their existing order, the identity
  port still deferred. Item 5 (lifting out `sharedRow`) is recorded for later but not picked up.
- Targeting both modes means **two independent data-adapter implementations** over one core.
  Folder-level maps directly onto the "two parallel trees" model. Field-level additionally needs the
  `__i18n__` split/merge layer, including suffixes inside nested bloks.
- It also adds a requirement that a single-mode target would not have: the adapter must **detect the
  mode from the space's data** (a story can carry a language from its folder *and* contain
  translatable fields), rather than receive it as a configuration constant.
- The set of required ports is unaffected by the "both" answer: the content codec and the identity
  port are needed identically in both modes.

## Open questions

Questions 1 and 2 are resolved — see Clarifications above. The rest remain open; none are blocking.

1. **Market fit** *[non-blocking]* — Storyblok ships built-in AI translation, XLIFF export, and a
   Translation Manager app. Matters because if the product covers an already-served scenario, it
   will not pay back regardless of how portable the code is.
2. **Extension form** *[non-blocking]* — a Space App over the Management API, or a library for the
   user's own backend? Matters because it determines whether there is a place for a UI at all, and
   where provenance would be stored (Storyblok has no table for it).
3. **Provenance storage** *[non-blocking]* — the `ProvenanceStore` port ports over, but there is no
   Storyblok-side implementation: an own database, Storyblok datasources, or a field on the story.
   Matters because without provenance, staleness and auto-translate fall away — half the plugin's
   value.
4. **`markdown`** *[non-blocking]* — Storyblok has a distinct `markdown` field type. Matters because
   that is one more codec (text with markup that cannot be handed to a translator as-is).
5. **Backwards compatibility** *[non-blocking]* — all five work items are declared
   behaviour-preserving, but theme 3 touches the pipeline hot path. Matters because the plugin is
   published and in use.
6. **Mode detection** *[non-blocking, new after the clarifications]* — with two target modes, how
   does the adapter know which one it is in: space settings, presence of language folders, or
   `translatable` in the component schema? Matters because mixed spaces (folders *plus* translatable
   fields inside) are a real case, and picking the wrong mode silently writes the translation to the
   wrong place.

## Consistency self-check

- Both halves of the question (structural coupling + Storyblok applicability) are covered by
  "Axis 1–3" and "What it would take".
- The discrepancy with the input's wording (separate package) is recorded in Phase 1.
- No conclusion contradicts a decision already taken (option C; the deferred identity port).
- Item 5 of the work list is new — it is not in the existing roadmap.
- The "both modes" answer is worked through in Clarifications and produced exactly one new open
  question (#6).

## Comprehension: 9/10

The core's code and Storyblok's data model were examined concretely and cross-checked against the
actual component-schema description from the Management API; purpose and scope are now settled. The
missing point is that the `__i18n__` layer (split and merge inside nested bloks) was assessed from
the model description rather than against live space data.

## Suggested next step

Done — this was exploratory work, and the report is the deliverable. No code was changed.

If the decision later becomes "build the product", the entry point is `/sp-architect` on the content
codec port (theme 3) and the identity port: they change the boundaries of an already-published core
and must be designed before any code. The `__i18n__` layer is designed separately, on the Storyblok
adapter side; it does not touch the core.
