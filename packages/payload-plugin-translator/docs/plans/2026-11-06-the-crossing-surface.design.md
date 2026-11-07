## Architecture Design — the crossing surface of the traversal languages

### The ask (ground truth)

A host language declares, per content position, which other language may take over a field's value
and which embedded blocks that language may enter; and the two incompatible copies of the
embed-resolution type become one that serves more than one host.

Evidence and problem statement: [language-interface-audit.md](./language-interface-audit.md). Its
requirements describe that audit's own deliverables, so this design states its own; the mapping to
its candidate changes is given per item.

- R1 (in) One embed-resolution type replaces the two that exist, serving a host with two embed lists and a host with one. (audit C1, finding F1)
- R2 (in) Which language may take over a field's value, and which embeds it may enter, are settable per field. (audit C2, finding F2)
- R3 (in) The embed vocabulary's false claim is corrected, and the shipped rich-text language is either named for its host or made host-neutral. (audit C6, finding F6)
- R4 (in) A field naming an unregistered language, and an embed naming a slug the field does not permit, each have a decided outcome. (NFR, failure semantics)
- R5 (in) A field's embed definitions become a lookup at most once per collection-and-field per process, never per crossing. (NFR, performance budget)
- R6 (out) Whether a crossing hands over the source tree or the target tree. (audit F3, its own body of work)
- R7 (out) Shared language helpers and `enter` refusal discipline. (audit F4, F5)
- R8 (out) Container-mode units for the rich-text language — the swap's own build step.

Contract versioning is deferred by the owner and recorded under Open questions. Security and
migration are N/A: no identity crosses this seam and nothing is persisted.

Constraints that shaped it:

- The option reshaped here is published by the swap, so its shape becomes a promise in a major.
  That is the deadline, not effort.
- The fixtures under `src/core/traversal/__tests__/fixtures/` are the kernel's coverage, not
  examples; a design that changes what they exercise removes coverage.
- Settled before this design and not reopened: `Language<N,C>` is the kernel contract and the kernel
  ships zero languages; an embedded block is not a language of its own; crossings host→format are a
  list the host iterates and each language publishes its own entry; `ContentCrossing` and
  `EmbedResolver` stay two types; neither side may take the other's names.
- 2026-11-06, owner: the plugin-level lists are the **default** for every field and a field's
  declaration **overrides** it for that field.

**Ground truth that closed the deciding question.** The blocks a rich-text field's editor allows
cannot be enumerated from this package at any point. Before Payload sanitizes, the field's `editor`
is an unresolved provider (`payload/dist/fields/config/types.d.ts:990`;
`@payloadcms/richtext-lexical/dist/types.d.ts:414-422`), and the package's own snapshot must run
there — `projectFieldLike.ts` exists because "Field definitions embed Lexical editor configs
containing async functions". After sanitization the resolved `blockConfigs` stay in closures
(`@payloadcms/richtext-lexical/dist/features/blocks/server/index.js:36-60`) and are never exposed as
data; the only route is `getSubFields` per encountered node, which Payload's own source marks
`@ts-expect-error - TODO: fix this` and the owner rejected. The design therefore never reads the
editor.

**Vectors:** structure + runtime (leading: structure) — structure because the ask is where each
responsibility lives and what shape the published surface takes; runtime because "config time or run
time" is a separate question with a separate wrong answer, and a resolved block list is a derived
copy. `contract` was considered and not selected: both sides of every seam here live in this package
and change in one commit, and its gate asks about timeouts and duplicate delivery, which a
configuration type has none of. `evolution` was considered and not selected: the change is additive,
ships in one deploy and is undone by reverting the commit; nothing is released, so there is no
compatibility window.

### Decision points

- D1 [load-bearing] Where per-field crossing settings come from, and who owns the key they travel
  under (axis: execution-boundary · dataflow-state · reversible)
- D2 [load-bearing] The shape of the published option, at plugin level and at field level
  (axis: abstractions · reversible now, one-way door at the major)
- D3 [load-bearing] The one embed-resolution signature (axis: abstractions · reversible)
- D4 [load-bearing] Where the embed identity's vocabulary lives, and what the shipped rich-text
  language is called (axis: abstractions · placement · reversible now, one-way door at the major)
- D5 [load-bearing] Who carries per-field settings from the schema snapshot to the walk
  (axis: dataflow-state · reversible)
- D6 [load-bearing] Override semantics: replace or merge, and how emptiness is spelled
  (axis: dataflow-state · reversible now, one-way door at the major)

### How it lands on the system

**Reuse.** `FieldProjection` in `src/core/kernel/field-traversal/projectFieldLike.ts` already
resolves `(BlockLike | BlockSlug)` against `payloadConfig.blocks`, memoises shared blocks and is
cycle-safe because it registers a projected block before projecting its fields. It already copies
`custom` by reference and its docblock already names `custom` a read channel. `withFieldTranslation`
in `src/field-config.ts` is an existing, published, typed writer for `custom.translateKit`.
`ContentCrossing` / `ContentOffer` in `src/languages/contentCrossing.ts` landed today.

**Affected.** `src/languages/*`; `src/core/kernel/field-traversal/{types,projectFieldLike}.ts`;
`src/core/domain/field-config/types.ts`; `src/field-config.ts`; `src/plugin.ts`; the kernel fixtures.

**Untouched.** `src/core/traversal/{contract,walk,collect,registry}.ts` — the kernel contract and
engine. `src/index.ts` gains no new name.

### The design

**Abstractions.**

| Contract | Responsibility | Invariant it holds | Callers |
|---|---|---|---|
| `EmbedFlow = "block" \| "inline"` · `EmbedName = string` · `EmbedIdentity = { name, flow?, data }` · `EmbedResolver = (embed: EmbedIdentity) => Crossing \| null` — `src/languages/embedCrossing.ts`, replacing `richTextCrossing.ts` | one embed convention owned by neither side: the format states an identity in neutral words, the host answers consent | neither side names the other; `null` means consent withheld, never "unrecognised" | both shipped languages, all four kernel fixtures |
| `ContentCrossing = { languageId: LanguageId; open: (offer: ContentOffer) => Crossing \| null }` — `src/languages/contentCrossing.ts` | a host's crossing-list entry, self-identifying before it is run | a format is never run until the host has consented, so no entry can seat a working copy the host will discard | `lexicalContent()`, the host's `boundary`, the `noteContent` of the crossing test |
| `FieldCrossingDeclaration = { formats?: readonly LanguageId[]; embeds?: FieldEmbeds }`, `FieldEmbeds` per D6 — `core/kernel/field-traversal/` | what one content position declares about who may take it over and what they may enter | no state has two spellings and no spelling has two meanings; `{}` is not inhabitable | `FieldTranslationConfig.crossing`, `withFieldTranslation`, `FieldProjection` |
| `FieldContent = { formats?; blocks?: Map<BlockSlug, FieldLike[]>; inlineBlocks?: Map<…> }` on `FieldLike.content` | the declaration, resolved once | a present Map is the field's own list; an absent Map inherits the host's default. Output-only, the mirror of input-only `blockReferences` | `FieldProjection` writes, `payloadFieldsLanguage.boundary` reads |

**Dependency direction.**

```
plugin.ts
  → src/languages/*                     host + format languages, crossing conventions
    → core/domain/field-config          FieldTranslationConfig, getFieldTranslationConfig
      → core/kernel/field-traversal     FieldLike, BlockLike, TRANSLATE_KIT_CUSTOM_KEY,
                                        FieldCrossingDeclaration, FieldContent, projectFieldLike
    → core/traversal                    untouched contract + engine
src/field-config.ts (published writer) → core/domain/field-config → core/kernel/…
```

All production edges point down; no cycles. The key's direction is reversed from today — the kernel
defines it and domain imports it — which is what removes the upward edge rather than flagging it.
One upward edge remains, test-only and type-only; see Accepted deviations.

**Placement.**

| Responsibility | Layer → module → file |
|---|---|
| the neutral embed convention | languages → `src/languages/embedCrossing.ts` (`RichTextContext` moves beside the format that produces and consumes it) |
| a host's crossing-list entry | languages → `src/languages/contentCrossing.ts` |
| Payload's Lexical, including the node-type → flow mapping | languages → `src/languages/PayloadLexical.language.ts` |
| host consent, per-field list selection, the default lists | languages → `src/languages/PayloadFields.language.ts` |
| the declaration's type and the `custom` namespace key | kernel → `core/kernel/field-traversal/types.ts` (+ `customKey.ts`) |
| resolving the declaration once per field | kernel → `core/kernel/field-traversal/projectFieldLike.ts` |
| the published authoring surface | domain → `core/domain/field-config/types.ts`; writer `src/field-config.ts` |
| boot refusal | `src/plugin.ts`, beside `refuseAnUnusableConfig` |

`src/languages/` stays flat: the package guide says a folder names a role, not a concept.

**Data flow & ownership.**

- *What may be entered here* — the field's declaration if it named that list, otherwise
  `payloadFieldsLanguage({ blocks, inlineBlocks })`. Exactly one owner per list at any moment; the
  two are never merged, so no value has two owners.
- *Who may take this field* — the field's `formats` if present, otherwise the configured crossing
  list in order, which is today's behaviour.
- *Derived* — `FieldLike.content` from `custom.translateKit.crossing` plus `payloadConfig.blocks` at
  config-build time and never after; the host's default Maps once per language instance, as today.
  The projection stores **only what the field declared**, never the effective list — that is what
  keeps the default readable in one place.
- *Writes* — unchanged: only the kernel's `setValue` and a format's in-place write-back touch
  content, and under the new entry shape a working copy is seated only after the host has consented.

**Runtime — execution boundary · caching · budget.**

- *Boundary.* All resolution at config-build time, in the process that builds the Payload config.
  Nothing new runs per request; nothing moves to the client.
- *Derived value and its staleness.* One resolved lookup per declared field, riding the schema
  snapshot. It cannot diverge inside a process: its inputs (`col.fields`, `payloadConfig.blocks`)
  are frozen once the config is built. What makes it right again is a process restart, which is the
  same event that rebuilds the snapshot. There is no in-process invalidation event to miss, so
  nobody needs to notice one failing to fire. Losing it loses nothing; the declaration stays in the
  user's config.
- *Budget.* Boot: one `Map` build per field that declares an embed list (a typical collection has
  0–5 such fields, each with at most a few dozen slugs), plus one extra pass over a schema already
  being walked. Walk: **zero** Map builds and **zero** list scans per crossing — one `Map.get` per
  embed node and one closure allocation per crossing. Crossing depth stays capped at `maxCrossings`.
- *Scheduling.* None.

### Requirement coverage

| R | Design element |
|---|---|
| R1 | `src/languages/embedCrossing.ts` — `EmbedIdentity`/`EmbedFlow`/`EmbedResolver`; `__tests__/fixtures/embed.ts` deleted; both shipped languages and all four kernel fixtures on one type. A two-list host reads `flow`, a one-list host ignores it |
| R2 | `custom.translateKit.crossing` → `FieldCrossingDeclaration` → resolved into `FieldLike.content` → read by `payloadFieldsLanguage.boundary` for the `formats` filter and the per-list choice |
| R3 | `embedOf` in `PayloadLexical.language.ts` performs the mapping the old docblock only claimed; the false claim is replaced by the neutral vocabulary it now describes; the name question is decided by D4 |
| R4 | boot refusal for an unregistered format id and for an embed slug resolving to no definition; a slug absent from a field's list stays a silent skip at walk time, by decision (D6) |
| R5 | `FieldContent` Maps built once per collection-and-field at config-build time; one `Map.get` per crossing |
| NFR contract versioning | deferred by the owner; the window and what closes it are recorded in Open questions |
| NFR security / migration | N/A — no identity crosses this seam and nothing is persisted |

### Vector gates

- **structure** — no gate beyond ST1–ST6; the merged design was re-checked against each. ST1: every
  new type has at least two callers, one existing. ST2: all production edges point down, and the
  key's relocation is what makes that true rather than a flag on it. ST3: no cycles; the direction
  is reversed, not duplicated. ST4: the hazard the graft created — baking the *effective* list into
  the projection would give it two owners — is closed by storing only what the field declared.
  ST5: every decision cites a verified constraint. ST6: `field-traversal` keeps one responsibility.
- **runtime — the staleness gate.** Answered above under Runtime, for the one derived value: how
  long it can be wrong (a process lifetime, with no possible divergence inside it), what makes it
  right (a restart), and who notices a missed invalidation (nobody needs to — there is no
  invalidation event). The honest residual is not staleness but drift between the plugin-level
  default and the editor's real lists, which no code here can observe; carried to Open questions.
- **headless-cms (advisory, `contract` not loaded)** — its rule that an unknown block must be
  reported rather than swallowed agrees with the boot refusal. Nothing was disqualified on it.

### Decisions (ADRs)

#### D1. The per-field declaration is read from `custom.translateKit`, resolved once at config-build time, and the kernel owns the key

- **Context:** the editor's allowed blocks are unreadable before and after sanitization (see ground
  truth), so the only live source is the field itself. `projectFieldLike.ts` already copies `custom`
  by reference and already names it a read channel.
- **Options considered:**
  - name the lists in the plugin option, keyed by collection and field path — all three candidates rejected it: it restates by hand what the field already is, and sits far from the editor
  - read the sanitized config lazily at run time — refuted by ground truth, not merely rejected
  - read `custom.translateKit.<key>` through the existing projection — proposed independently by all three candidates
  - pass a declaration reader into the projection as a parameter (raised at adjudication) — rejected under ST1, since `projectFieldsToFieldLike` has one production consumer and a port with one implementer is indirection
- **Decision:** the third, resolved eagerly inside `FieldProjection` — the one place that already
  owns slug resolution, the shared-block memo and the cycle guard. To satisfy ST2, both
  `TRANSLATE_KIT_CUSTOM_KEY` and `FieldCrossingDeclaration` move down into
  `core/kernel/field-traversal/`, and `core/domain/field-config` imports them. The declaration is
  defined once, which rules out both an upward kernel→domain edge and a kernel-local mirror of a
  domain type (ST4). RT1: config-build time is the earliest correct boundary.
- **Consequences:** the kernel names `translateKit` in code rather than only in prose, and
  `core/domain/field-config` becomes a re-exporting consumer of a kernel constant. Declared blocks go
  through the existing `block()`/`sharedBlock()` path, so an inline definition is projected **by
  value** and its nested `localized` survives Payload's in-place sanitizer — the exact defect that
  projection exists to prevent. Rules out any future "ask the live Payload instance" path without
  reopening this. Rests on Payload not mutating `custom` during sanitize, which the projection
  already asserts and the package already depends on for `exclude`.
- **Reversible:** yes — moving a constant and a type is mechanical and in-package; nothing stored,
  no release coordination.
- **Guarded by:** the boot refusal of D6, plus an import rule forbidding `src/core/kernel/**` from
  importing `src/core/domain/**`; where the linter cannot express it, the architecture test of build
  step 1 asserts it by scanning import specifiers. Built in step 4.

#### D2. The plugin lists stay as the default; the field overrides through the already-published `FieldTranslationConfig`

- **Context:** the owner's decision of 2026-11-06. All three candidates deleted `blocks` and
  `inlineBlocks` from `PayloadFieldsConfig`; that deletion is overruled, because a default of "no
  embeds until declared" reproduces, one field at a time, the defect this work removes.
- **Options considered:**
  - extend the published `FieldTranslationConfig` with a `crossing` member, dropping the plugin lists (max-reuse)
  - publish a new `RichTextFieldConfig` under the key `richText`, dropping the plugin lists (min-new-abstraction)
  - publish a new `FieldContentDeclaration` under the key `content`, dropping the plugin lists (cleanest-boundaries)
- **Decision:** `PayloadFieldsConfig` keeps `crossings`, `blocks` and `inlineBlocks`. The field-level
  surface is max-reuse's carrier with cleanest-boundaries' rigour: `FieldTranslationConfig`, already
  published, gains `crossing?: FieldCrossingDeclaration`. No new name is published — contextual
  typing reaches the member through `withFieldTranslation(field, config)`, which falsifies the stated
  reason for publishing one, and ADR-0002 forbids the rest. The key is `crossing`: not `richText`,
  because the field-type test was deliberately removed and a crossing on a `json` field is already
  proved by test, so a host key must not name a format family; and not `content`, because `crossing`
  is the package's established word. Two repairs to the published writer are forced by it:
  `withFieldTranslation` must merge into an existing `custom.translateKit` rather than replace it, and
  control injection must be gated on a runtime control-candidate check rather than on an overload
  guarantee that a second config member breaks — otherwise a crossing declared on a `json` field runs
  the field-control positioner on a field that has no control. Today's behaviour for today's call
  shapes is preserved exactly.
- **Consequences:** commits the package to `custom.translateKit.crossing` as the field-level channel
  and to the plugin lists as the default. A user who wants the declaration without the translate
  control on a text-bearing field has no spelling today; adding one later is additive. Rules out a
  per-collection or per-path override table at plugin level.
- **Reversible:** yes while unpublished; no once the swap publishes the major — after that, changing
  the member name or the shape of `FieldEmbeds` is a breaking change in a released major.
- **Guarded by:** the type itself, since `FieldEmbeds` has no `{}` inhabitant, plus a test on
  `withFieldTranslation` asserting that a crossing declared on a `json` field adds no component and
  that two composed calls preserve both members. Built in step 4.

#### D3. One embed-resolution signature, in a vocabulary neither side owns

- **Context:** requirement C1 and finding F1 — `EmbedKind = "block" | "inlineBlock"` names Payload's
  two editor lists, which is why the second host wrote its own two-parameter copy.
- **Options considered:**
  - `EmbedNode { kind, name, data }` with `kind` widened to a documented string, the host switching on the format's words (max-reuse)
  - `(name, data, list?: EmbedKind)` with the union relocated into the kernel (min-new-abstraction)
  - `EmbedIdentity { name, flow?, data }` with a neutral `EmbedFlow = "block" | "inline"` (cleanest-boundaries)
- **Decision:** the third. `EmbedFlow` is rich text's own word — every rich-text format distinguishes
  a block-level embed from an inline one — so it belongs to the convention and to neither
  participant. The first is the host taking the format's node-type words; the second is the format
  taking the host's list names, and puts them in a layer whose own docblock reads "Nothing
  Payload-specific leaks in". Only the third makes the old claim true rather than deleting it, which
  is what C6 asks. `name` is required: a format that cannot name its embed does not ask, and the
  shipped language already guards that. `flow` is optional: a one-list host ignores it, and a
  two-list host answers `null` when it is absent rather than guessing a list.
- **Consequences:** `fixtures/embed.ts` is deleted and the kernel fixtures take the real convention,
  type-only. A one-list format paired with a two-list host yields no crossing for its embeds; that
  pairing exists only in fixtures today and the boot refusal does not catch it, so it is recorded
  here rather than hidden. The resolver is still offered to every entry including formats with no
  embeds — a cost already accepted when the crossing list landed.
- **Reversible:** yes while unpublished — `src/index.ts` exports nothing from `src/languages/`.
- **Guarded by:** the type, plus the architecture test of build step 1 asserting that every
  `src/core/** → src/languages/**` import is type-only and lives under `__tests__/`. Built in step 1.

#### D4. The shipped rich-text language is named for what it is: Payload's Lexical

- **Context:** C6 and finding F6 — both format languages hardcode their host's embed vocabulary,
  uniformly, and the defect is the claim rather than the coupling. Plain Lexical has no embed
  concept; `block`, `inlineBlock`, `fields` and `fields.blockType` are Payload's.
- **Options considered:**
  - document, do not parameterise; keep the file name and the id (max-reuse, min-new-abstraction)
  - rename to `PayloadLexical.language.ts` / `payloadLexicalLanguage` / `PAYLOAD_LEXICAL_ID`, confining Payload's vocabulary to `embedOf` (cleanest-boundaries)
- **Decision:** rename. The reason is dated, not aesthetic: with D2 the language id stops being
  internal and becomes a value users type in `crossing.formats`, and the registry enforces id
  uniqueness — so `lexical` both misreports what the language is and squats the id a plain-Lexical or
  second Lexical-based host would need. The window in which the rename costs nothing closes when the
  swap publishes. Under D3's neutral flow, `embedOf` now performs a real mapping, so Payload's
  vocabulary is confined to one function; a host-neutral variant is a later parameterisation and is
  deliberately not built, because no second caller exists (ST1).
- **Consequences:** a mechanical rename across `src/languages/` and its tests; `src/index.ts` is
  unaffected. "Plain Lexical" is given up as a name and kept as a possibility.
- **Reversible:** yes now; no after the major — the id becomes a value in user config, and changing
  it would need a coordinated release plus a migration of every field declaration. Accepted by the
  owner on 2026-11-06, while it is still free.
- **Guarded by:** nothing — a name cannot be mechanically kept honest. The nearest real guard is the
  registry's existing duplicate-id check, which only fires once a second Lexical-based language
  exists.

#### D5. `FieldLike.content` carries the resolved declaration, output-only, as prebuilt Maps

- **Context:** the declaration must reach `boundary`, which already receives the field; the budget
  allows a lookup at most once per collection-and-field per process and none per crossing.
- **Options considered:**
  - a `crossing` member resolved through the existing block path (max-reuse)
  - a `richText` member holding plain arrays, scanned with `find` (min-new-abstraction)
  - a `content` member holding prebuilt Maps (cleanest-boundaries)
  - lazy memoisation in a weak map keyed by the projected field (raised at adjudication)
- **Decision:** the Maps, resolved through the existing block path, named `content`. The objection
  that Maps cost JSON-cleanliness is void: the projected tree is already cyclic by design and nothing
  in the package serialises it. Plain arrays scan linearly on the walk to save one small boot
  allocation, which is the wrong trade when boot is paid once. The lazy variant meets the budget with
  no kernel change but cannot produce a **boot** refusal, so it would trade the failure-semantics
  answer for a layering convenience. The projection stores only what the field declared, never the
  effective list, so the default stays readable in exactly one place (ST4). The member is
  output-only, the exact mirror of the input-only `blockReferences` already documented in the same
  interface, so the asymmetry has a cited precedent (ST5).
- **Consequences:** `FieldLike` gains a member Payload's own `Field` does not have, present only on
  projected trees. The schema map stays in-process only; this member and the existing cycles both
  block serialising it. Per crossing the cost is one lookup and one closure.
- **Reversible:** yes — an in-process derived member; removing it needs no migration and no
  coordinated release.
- **Guarded by:** the type's optionality (a Map is present only where the author declared that list)
  plus the boot refusal of D6, which means an unresolvable slug can never reach a Map. Built in step
  4, refusal in step 6.

#### D6. A field's declaration replaces the default per list; an empty list must be written, never implied

- **Context:** new under the owner's decision and designed by no candidate. The owner's stated reason
  is that silent emptiness is the defect, so the ambiguity between "declared nothing" and "declared
  empty" is the thing to remove. Two rich-text fields in one collection legitimately allow different
  blocks, so a field must be able to narrow, not only widen.
- **Options considered:**
  - merge the field's list with the plugin default
  - replace wholesale, the whole `embeds` object being the unit
  - replace per list
  - a `mode: "replace" | "merge"` discriminator — rejected as a documented convention in a type's clothing, against the owner's preference for a type that admits no illegal state
- **Decision:** replace, per list, spelled so that no state has two spellings and no spelling has two
  meanings:

  ```ts
  type FieldEmbeds =
    | "none"
    | { readonly blocks: readonly EmbedDefinition[]; readonly inlineBlocks?: readonly EmbedDefinition[] }
    | { readonly blocks?: readonly EmbedDefinition[]; readonly inlineBlocks: readonly EmbedDefinition[] };
  ```

  `embeds` absent means both lists inherit the default; `"none"` means both are empty; an object
  replaces each list it names and inherits each it omits. `{}` is not inhabitable, so an empty
  declaration cannot be written by accident. Merge is rejected because it cannot narrow and because
  it would give the effective list two owners (ST4). The authoring union is interpreted in exactly
  one place — the projection's resolver — which emits the uniform resolved shape, so the union never
  spreads.

  Failure semantics are decided as a pair: **typos die at boot, consent stays silent at walk time.**
  One pass after the schema map refuses a `formats` entry naming no registered crossing — possible
  only because D2's entries carry a static id — and a declared embed slug that resolves to no
  definition, each naming collection, field path and the offending value. After that pass, "not in
  the list" at walk time can only mean the author did not list it, so the existing silent skip is
  honest. The boot check is required for the embed case because it is the only signal there: a
  refused embed node is not a text node, so the selection report is never reached. The field case
  also keeps a runtime backstop through that report, which an existing test asserts.
- **Consequences:** a field that declares one list and inherits the other reads naturally; a field
  that wants neither writes `"none"`. Commits the package to a union-shaped authoring type that must
  be widened compatibly if a third embed list ever appears. Rules out merge semantics without a
  major. The boot pass adds one walk over the schema at config time and turns two classes of typo
  into a refused boot — a deliberate shift from "translates less than you asked, quietly" to "does
  not start".
- **Reversible:** yes now; no at the major — replace-to-merge is a silent semantic change to
  configurations already in the field, and `"none"` cannot be removed once written.
- **Guarded by:** the union type itself, plus the boot refusal in `plugin.ts`, plus a test fixing all
  three spellings against their effective lists. Built in step 4 for the type, step 6 for the
  refusal.

### Build sequence

1. **The neutral embed convention.** `src/languages/embedCrossing.ts` replaces `richTextCrossing.ts`;
   `RichTextContext` moves beside the format that produces and consumes it; `embedOf` performs the
   real mapping; the false docblock is rewritten; `__tests__/fixtures/embed.ts` is deleted and all
   four kernel fixtures take the one type. Verifies: every kernel fixture suite green with the same
   cases, including that an embed with no name still yields no crossing; the architecture test
   asserting every `src/core/** → src/languages/**` import is type-only and under `__tests__/`.
   · covers: R1, R3 · via /sp-task · incremental
2. **Rename to Payload's Lexical.** `PayloadLexical.language.ts`, `payloadLexicalLanguage`,
   `PAYLOAD_LEXICAL_ID`; the barrel updated. Verifies: a pure rename — the whole suite green with no
   behavioural difference, `src/index.ts` unchanged. · covers: R3 · via /sp-task · incremental
3. **The crossing entry carries its id.** `ContentCrossing = { languageId, open }`; `lexicalContent()`
   declares the id; the host consults it before calling `open`. Verifies: a red-first regression test
   that a host declining a format leaves the stored value untouched — without the id the entry has
   already seated a clone of the source over it. · covers: R2 · via /sp-task · incremental
4. **The declaration: type, carrier, resolution, writer.** The key and the declaration types move
   into the kernel; `FieldTranslationConfig` gains `crossing?`; `FieldLike.content` and its
   resolution inside `FieldProjection` through the existing block path; `withFieldTranslation` merges
   rather than replaces and gates control injection on a runtime check; `@since` on every new
   published name. Verifies: the three spellings resolve to the stated effective lists; a declared
   inline block keeps nested `localized` after a simulated sanitize; a self-referential declaration
   terminates; a crossing on a `json` field adds no admin component; the kernel-to-domain import rule.
   · covers: R2, R5 · via /sp-task · incremental
5. **The host reads the declaration.** `payloadFieldsLanguage` keeps its lists as the default and
   prefers a field's resolved Map per list; `formats` filters the crossing list; the per-field
   resolver is built per boundary call. Verifies: two rich-text fields in one collection with
   different lists translate differently — the case that is inexpressible today; a field with no
   declaration behaves exactly as today; zero Map builds per crossing. · covers: R2, R5 · via /sp-task
   · incremental
6. **Boot refusal.** One pass in `plugin.ts` after the schema map, beside the existing refusal:
   unknown format id, unresolvable embed slug, each naming collection, field path and value.
   Verifies: each case throws at config build with the path in the message; a valid config boots
   unchanged; the sandbox app still starts. · covers: R4 · via /sp-task · incremental

Every in-scope requirement lands in at least one step. No step is big-bang: none of this is wired
into the translation pipeline yet, and no stored data has the old shape.

### Open questions / unresolved

- **O-A — the translate control and the declaration.** Declaring a crossing on a text-bearing field
  also injects the per-field translate control, because D2 preserves today's rule. A user who wants
  one without the other has no spelling. Additive to fix later, non-breaking. Blocks nothing.
- **O-B — where the crossing list itself comes from.** The `formats` filter and the boot refusal both
  need the configured crossing list and the default block lists to exist as a plugin option, and that
  option is still unbuilt — it belongs to the swap's own build step 1, whose naming question is open
  there. Not re-decided here. Blocks build steps 5 and 6 from being exercised end to end; both can be
  built and unit-tested without it.
- **O-C — the default cannot see the editor. Resolved 2026-11-06.** The owner accepted that the
  swap's "every block the editor allows" is superseded; its D6 now carries the struck wording, the
  evidence and the replacement — the default is every block the host names at plugin level,
  overridable per field. The residual stands and cannot be closed by any mechanism: a block added to
  a field's editor and not to the plugin list is silently untranslated. It is carried as text the
  option's documentation must contain, beside the existing note that widening a configuration is
  safe and narrowing it is not. Blocks nothing.
- **O-D — contract versioning, deferred by the owner.** The field declaration's shape and the
  renamed language id become promises in a major the moment the swap publishes. Recording the date
  that window closes is the whole content of the deferral.

### Accepted deviations

- **ST2, for one test-only, type-only edge:** the four kernel fixtures import the embed convention
  from `src/languages/embedCrossing.ts`. Permitted because `fixtures/embed.ts` exists precisely
  because the convention failed to serve the second host, so a fixture proving the new convention
  serves two hosts while importing a copy of it proves nothing — the import is the proof. The
  alternatives are worse: placing the convention in the kernel is a shipped placement violation and
  the traversal kernel ships zero languages; keeping the duplicate fails C1 as written. `import type`
  is erased, so the shipped dependency graph gains no edge. **Cost:** a change to the convention can
  break the kernel's own suite, and extracting the traversal kernel as a package would require
  re-homing this type first. **What would force revisiting:** a second non-test importer, any
  non-type import from `src/core/**` to `src/languages/**`, or a decision to extract the kernel. The
  architecture test of step 1 fires on the first two.
- **Reading recorded for the owner:** "`src/core/traversal/` is untouchable" is taken to mean the
  contract and engine, not `__tests__/fixtures/`, because C1 names `fixtures/embed.ts` as one of the
  two files to be replaced. If that reading is wrong, C1 is unsatisfiable as written and goes back.

### Rejected / grafted (for the record)

- max-reuse D1 (the kernel reads a domain key, direction unresolved) — disqualified: ST2 and ST4;
  repaired by grafting the relocation.
- all three candidates' D2 (delete the plugin lists) — disqualified by the owner's decision.
- max-reuse D3 (`EmbedKind` widened to a bare string, the host switching on the format's words) —
  disqualified: the host takes the format's names, and the type permits states where exactly two are
  meaningful.
- min-new-abstraction D3 (the union relocated into the kernel) — disqualified: placement and the
  neither-side-names rule; its premise is contradicted by the kernel type file's own docblock.
- min-new-abstraction D2 (publish a new name under the key `richText`) — rejected: the premise is
  falsified by the existing published writer, ADR-0002 forbids the new name, and a host key must not
  name a format family.
- min-new-abstraction D5 (defer `setValue` until a crossing is accepted) — rejected: the hazard
  disappears under the entry shape grafted from cleanest-boundaries; prefer one mechanism fewer.
- min-new-abstraction's argument that the existing selection report already makes a refused crossing
  non-silent — rejected on evidence: true for an uncrossed field, false for a refused embed, because
  an embed node is not a text node and is never selected.
- cleanest-boundaries' `src/languages/crossing/` folder — rejected: the package guide says a folder
  names a role, and `src/languages/` is small enough to stay flat.
- **Grafted from max-reuse:** extend the published `FieldTranslationConfig` rather than publish a new
  name; resolve declared blocks through the existing block path with inline definitions projected by
  value.
- **Grafted from min-new-abstraction:** the namespace key moves down to the kernel — extended here so
  the declaration type moves with it, leaving one definition rather than two.
- **Spine, cleanest-boundaries:** the self-identifying crossing entry; the neutral flow vocabulary;
  prebuilt Maps; the boot refusal; the rename.

### Next

`/sp-seam-trace` on this file — three or more seams meet here (host language ↔ format language, both
languages ↔ the embed convention, the projection ↔ the host, the plugin boot check ↔ the schema map),
and one of them is the seam whose earlier shape already produced a correctness hazard. Then `/sp-task`
on build step 1.
