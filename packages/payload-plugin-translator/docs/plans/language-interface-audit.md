# Traversal languages — are they one interface, and which parts should be

Source: language-interface-audit.source.local.md

Next: sp-architect

## Problem Statement

The package now holds six implementations of the kernel's `Language<N, C>` contract — two shipped,
four written as test fixtures — and two incompatible copies of the convention by which a rich-text
language asks its host about an embedded node. They already implement one interface: `Language<N, C>`
is the contract and every one of them satisfies it. What they do not share is everything *around*
the contract: how a language is constructed, where it learns which other language takes over at a
given position, which embedded content it is allowed to descend into, and whether a crossing hands
over the source tree or the target tree. Those answers were each decided locally, and two of them
have since been decided three different ways in the same repository. The cost is not untidiness:
one of the divergences means the option this package is about to publish cannot express a
configuration Payload itself supports, and another means the only second host in the repository had
to write its own copy of a type whose docblock claims to belong to neither side.

## Codebase map

The whole population, with paths.

**Kernel contract (unchanged by this work)**

| Path | Role |
|---|---|
| `src/core/traversal/contract.ts` | `Language<N,C>`, `Crossing`, `Step`, `TextUnit`, `TextLeaf`, `IdPath` |
| `src/core/traversal/walk.ts` | the walk, `LeafVisit`, crossing and cycle guards |
| `src/core/traversal/collect.ts` | `collectTranslationTargets`, `applyTranslations` |
| `src/core/traversal/registry.ts` | id uniqueness |

**Shipped languages**

| Path | Side | Construction |
|---|---|---|
| `src/languages/PayloadFields.language.ts` | host | `payloadFieldsLanguage(config?: PayloadFieldsConfig)` |
| `src/languages/Lexical.language.ts` | format | `lexicalLanguage()` — no arguments |

**Crossing conventions — two incompatible copies**

| Path | Signature |
|---|---|
| `src/languages/richTextCrossing.ts` | `EmbedResolver = (kind: EmbedKind, blockType: string, data: Record<string, unknown>) => Crossing \| null`, `EmbedKind = "block" \| "inlineBlock"` |
| `src/core/traversal/__tests__/fixtures/embed.ts` | `EmbedResolver = (name: string \| undefined, data: unknown) => Crossing \| null` |
| `src/languages/contentCrossing.ts` | `ContentCrossing = (offer: ContentOffer) => Crossing \| null` (host asks formats) |

**Fixture languages — where a second host and a second format already exist**

| Path | Side | Construction |
|---|---|---|
| `src/core/traversal/__tests__/fixtures/payloadFields.ts` | host (Payload-shaped) | `payloadFieldsLanguage()` — no arguments |
| `src/core/traversal/__tests__/fixtures/storyblok.ts` | host (Storyblok) | `storyblokLanguage()` — no arguments |
| `src/core/traversal/__tests__/fixtures/prosemirror.ts` | format | `prosemirrorLanguage(options?: { cut })` |
| `src/languages/__tests__/PayloadFields.contentCrossings.test.ts` | format (`noteLanguage`) | `noteLanguage()` — no arguments |

**Harnesses that show the intended wiring**

| Path | Shows |
|---|---|
| `src/core/traversal/__tests__/fixtures/harness.ts` | per-field crossing config; the Storyblok and Payload entry contexts |
| `src/core/traversal/__tests__/crossing.storyblok.test.ts` | Storyblok → ProseMirror → Storyblok, a full second pair |
| `src/languages/__tests__/fixtures/lexical.ts` | the wiring the swap will install |

**Prior art**: `docs/plans/2026-10-20-the-traversal-kernel.task.md`,
`docs/plans/2026-10-20-entering-a-language.task.md`, `docs/plans/2026-10-21-the-lexical-language.task.md`
built this population. `docs/plans/2026-11-06-the-swap.design.md` (uncommitted) carries D13, which
introduced `ContentCrossing` today and is the decision this audit extends.

## External dependencies

**Payload's lexical editor configuration — the blocks embeddable in one rich-text field.** F2's
repair needs them per field. Confirmed **not reachable where the schema map is built**:

- `plugin.ts:180-183` projects `col.fields` into `FieldLike` before Payload sanitizes, which is
  deliberate — `types/CollectionSchemaMap.ts` says the snapshot is taken "before Payload's sanitizer
  mutates the originals, so nested `localized` flags survive".
- At that point a rich-text field's editor is still a provider, not an adapter:
  `node_modules/payload/dist/fields/config/types.d.ts:990` types it
  `RichTextAdapter | RichTextAdapterProvider`, and
  `node_modules/@payloadcms/richtext-lexical/dist/types.d.ts:414-422` types the provider as a
  function returning `Promise<LexicalRichTextAdapter>`. The blocks are arguments closed over inside
  `BlocksFeature({ blocks })`; nothing on the unsanitized field exposes them.
- They become readable only after sanitization, inside the feature itself:
  `node_modules/@payloadcms/richtext-lexical/dist/features/blocks/server/index.js:37-50` resolves
  `blockReferences ?? blocks` against `_config.blocks` — the same slug-reference resolution
  `projectFieldsToFieldLike(col.fields, payloadConfig.blocks)` already performs for ordinary blocks
  fields.

So "per field" is confirmed as the right **shape** and refuted as a thing the existing snapshot can
carry. The design must choose a different source: the host naming them in the plugin option, or a
lazy read from the sanitized config at run time, where the adapter is resolved.

## Findings

### F1 — The embed convention is already two incompatible types, and the second host wrote the second one

`src/languages/richTextCrossing.ts` states that it belongs to neither side: a host that took a
format's names could be configured with that format alone, and a format that took its host's names
could serve one host alone. The only other host in the repository could not use it. It declares its
own in `src/core/traversal/__tests__/fixtures/embed.ts`, two parameters instead of three and no
`kind`, because `EmbedKind = "block" | "inlineBlock"` names Payload's two editor lists and Storyblok
has one (`FieldDef.allowedEmbeds`). The claim is falsified by the repository that makes it.

### F2 — Where a crossing is configured is answered three ways, and the shipped answer is the least expressive

| Implementation | Which language takes over | Which embeds are allowed |
|---|---|---|
| `src/languages/PayloadFields.language.ts` | the `ContentCrossing` entry names itself — one list per language instance | `config.blocks` / `config.inlineBlocks` — one pair per language instance |
| `__tests__/fixtures/payloadFields.ts` | `field.richTextLanguage` — **per field** | `field.embeds` — **per field** |
| `__tests__/fixtures/storyblok.ts` | `def.richTextLanguage` — **per field** | `def.allowedEmbeds` — **per field** |

Two of three put both per field. This is not a style difference: Payload configures the blocks
embeddable in a rich-text field *in that field's own editor* (`lexicalEditor` with a blocks
feature), so two rich-text fields in one collection can legitimately allow different blocks. A pair
of lists held once per language instance cannot express that, and it is the shape about to become a
published option.

### F3 — A crossing hands over the source tree in one implementation and the target tree in the others

`src/languages/PayloadFields.language.ts` (through today's `lexicalContent()`) clones the **source**
value and seats the clone where the value sat, so a rich-text field is rebuilt from the source —
an overwrite. `__tests__/fixtures/payloadFields.ts` and `__tests__/fixtures/storyblok.ts` both hand
over `cursor.target[name]` as it stands, so the existing translation is amended in place. The two
behave identically wherever source and target are the same object, which is what
`harness.ts`'s `fromPayload` and `fromStoryblok` pass. The contract says nothing about which is
correct, so a new host picks by reading whichever implementation it happens to open.

### F4 — `enter` refusal discipline splits down the middle, and one fixture disables a required member through it

The contract gives `enter` a `null` return meaning "this context is not mine", raising
`CannotEnterLanguageError`. `src/languages/PayloadFields.language.ts`,
`src/languages/Lexical.language.ts` and the `noteLanguage` of
`src/languages/__tests__/PayloadFields.contentCrossings.test.ts` validate and refuse.
`__tests__/fixtures/payloadFields.ts` and `__tests__/fixtures/storyblok.ts` cast the context blind.
`__tests__/fixtures/prosemirror.ts` goes further: `embed ?? (() => null)` substitutes a resolver
that declines every embed, so a wiring mistake that omits the resolver produces a walk which
silently translates prose and leaves everything embedded untranslated — the exact failure the
contract makes `boundary` required to prevent, reintroduced one member earlier.

### F5 — Four implementations repeat "a plain string is one unit", three with a redundant guard

`textUnits` is byte-comparable in `src/languages/PayloadFields.language.ts`,
`__tests__/fixtures/payloadFields.ts`, `__tests__/fixtures/storyblok.ts` and the string branch of
`__tests__/fixtures/prosemirror.ts`. Three of them re-test `value.trim() === ""` although the
contract guarantees `isEmpty` has already run and rejected it; `src/languages/PayloadFields.language.ts`
does not. `isEmpty` itself is the shared `core/kernel/utils/isEmpty.js` in the two shipped languages
and a locally retyped two-liner with different semantics (an empty array is not empty) in the two
fixture hosts.

### F6 — Both format languages hardcode their host's embed vocabulary; the pattern is consistent and undeclared

`src/languages/Lexical.language.ts` recognises an embed by node type `"block"`/`"inlineBlock"`,
reads its content from `fields` and its discriminator from `fields.blockType`. Those are Payload's
names for nodes Payload's editor writes; plain Lexical has no embed concept.
`__tests__/fixtures/prosemirror.ts` does the same thing for Storyblok, recognising `"blok"` and
reading `attrs.body`. So the asymmetry is real but it is **uniform**: a rich-text language embedded
in a CMS necessarily knows how that CMS stores embeds in its trees. What is wrong is not the
coupling but the claim: `EmbedKind`'s docblock says a rich-text language "maps whatever its own
format calls an embed onto one of these two", and neither implementation maps anything — both match
their host's literal node names.

### F7 — Nothing in the population wants a member `Language<N, C>` does not have

Six implementations, no member missing. Two members are filled in rather than implemented —
`prosemirrorLanguage`'s `selects: () => true` and `noteLanguage`'s `boundary: () => null` — and both
are the contract working as designed, because a required member is how "nothing here is foreign" is
said out loud instead of forgotten. `isEmpty` is the one member that would be better with a shipped
default than with six hand-written versions, but it earns its place as a member: ProseMirror's is
container-aware and could not be defaulted.

### F8 — Answer to "should the two crossing types be merged": no

*For merging*: both are `(…) => Crossing | null`, both are consulted at a `boundary`, both let the
asker stay ignorant of who answers, and both use `null` for "not mine".

*Against merging*: they are keyed differently and their `null` means different things.
`ContentCrossing` is **recognition** — candidates inspect a value's shape, and `null` means "I do
not recognise this format". `EmbedResolver` is **consent and lookup** — the format hands over a name
the *host* owns, and the host answers from its configuration, not from the data;
`richTextCrossing.ts` says its `null` skips the embed "silently", which is a statement of consent
withheld, not of recognition failed. Merging would make the embed case carry a name through a
value-shaped offer and the recognition case carry a meaningless name, and would erase the
distinction between "unknown format" and "not permitted".

Keep them separate. The defect worth fixing is F1 — that `EmbedResolver` exists twice — not that it
exists alongside `ContentCrossing`.

## Requirements

- R1 (in) Every implementation of the traversal `Language` contract in this package is compared
  against the others, and each divergence is recorded as either a consequence of the format or a
  decision taken inconsistently. Delivered as F1–F8 above.
- R2 (in) A stated answer, with its reasoning, to whether the host-asks-formats and
  format-asks-host crossing conventions are one concept and should be one type. Answered in F8: no.
- R3 (in) A confirmed or refuted account of whether the shipped rich-text language is tied to its
  host's vocabulary, checked against the second host present in the repository. Answered in F1 and
  F6: confirmed, and uniform across both format languages.
- R4 (in) A stated answer to whether language construction and configuration has a shape, and what
  a shared shape would be. Answered in F2: no shape; the shape the population points at is per
  content position for who-takes-over and what-may-be-entered, and per language instance only for
  how a language cuts its own content.
- R5 (in) Duplicated logic across implementations is named with its locations, so a later change
  can remove it rather than add a seventh copy. Delivered as F5.
- R6 (in) A stated answer to whether the contract is missing a member or carries one that only one
  implementation needs. Answered in F7: neither.
- R7 (out) Changing `Language<N, C>` itself. The contract is settled and the kernel ships no
  language; nothing found here argues against either.
- R8 (out) Making an embedded Payload block a language of its own. Settled before this audit.
- R9 (out) Designing the changes. This defines what is wrong and what each repair costs; which
  repairs are made, and how, is decided in a design document.
- R10 (out) [inferred] Touching the fixtures' *behaviour* to make them uniform — rests on: the fixtures encode cases the kernel's tests depend on, so alignment that changes what a fixture exercises removes coverage rather than adding consistency.

**Non-functional scan.** Performance — relevant: F2's repair moves a per-instance lookup to a
per-field one, on a path walked once per field per run; the cost is a map build per crossing rather
than per language. Security / access control — N/A, no identity or permission crosses these seams.
Accessibility — N/A. i18n — relevant only in the sense that this whole subsystem exists to serve it;
no new surface. Observability — relevant: F4's `embed ?? (() => null)` is a silent failure mode, and
the repair is the one place in this audit where a wiring mistake currently produces no signal.

## Candidate changes, with cost

Not decisions. The inputs to the design.

| # | Change | Fixes | Cost |
|---|---|---|---|
| C1 | One `EmbedResolver` type, serving both hosts: the format supplies the identity in its own vocabulary and the host interprets it, so a host with one embed list and a host with two can both answer | F1 | small — one type, two call sites, delete `fixtures/embed.ts` |
| C2 | Crossing configuration moves from the language instance to the content position: which language takes over, and which embeds it may enter, are carried per field | F2 | medium-to-large — changes `PayloadFieldsConfig`, the option about to be published; both fixture hosts show the shape, but the source is an open design decision because the editor's blocks are unreadable at snapshot time (see External dependencies) |
| C3 | The contract states whether a crossing hands over source or target, and the implementations agree | F3 | small in code, a decision in substance |
| C4 | Refusal discipline stated in the contract and honoured by the fixtures; `prosemirrorLanguage` stops defaulting a missing resolver | F4 | small — one default removed, two fixtures validate |
| C5 | A shipped helper for the plain-string unit and a shipped default for `isEmpty`; the redundant trim guard goes | F5 | small, cosmetic, touches five files |
| C6 | `EmbedKind`'s claim corrected, and a decision on whether the shipped rich-text language is named and documented as Payload's Lexical or made host-neutral by configuration | F6 | small if documented, medium if parameterised |

**Size check.** This is more than one task. C1 + C2 + C6 are one body of work — they are the same
question about who owns the embed vocabulary, and C2 changes a published surface. C3 is a separate
decision about write-back semantics that touches the swap directly. C4 + C5 are a tidy-up that
should not share a pull request with either. Proposed split: **(a) the crossing surface** (C1, C2,
C6), **(b) write-back semantics at a crossing** (C3), **(c) shared language helpers** (C4, C5).

## Acceptance Criteria (draft)

| AC | Covers | Criterion | How it is checked |
|---|---|---|---|
| AC1 | R1 | Every file listed in the codebase map's language rows is compared on all six contract members, and each divergence is classified | the findings name the file and member for each; six implementations accounted for |
| AC2 | R2 | The merge question has an answer and both sides are argued before it | F8 states the case for and against, then decides |
| AC3 | R3 | The claim about the shipped rich-text language is settled against the second host, not asserted | F1 cites `fixtures/embed.ts` as the second host's own copy; F6 cites the node names in both format languages |
| AC4 | R4 | Construction is compared across all six, and the shape the population supports is named | F2's table, three rows with the config location for each |
| AC5 | R5 | Each duplicated implementation is located by path and member | F5 names four paths for `textUnits` and four for `isEmpty` |
| AC6 | R6 | The contract-member question is answered in both directions — missing and over-specified | F7 answers both |
| AC7 | R1–R6 | Every finding carries a path, so the design can reopen it without re-reading the package | each of F1–F8 names at least one file |
| AC8 | R9 | No source file is modified by this run | `git status` shows no change under `src/` attributable to it |
| AC9 | — | A finding that cannot be supported is withdrawn rather than softened | F6 refutes the simple form of the asymmetry claim (both formats do it) while confirming the defect is the docblock's claim |

## Open Questions

Coverage scan, then the restate check.

1. **Per-field crossing configuration and Payload's editor** *[resolved]* — the projection is
   **not** available where the schema map is built; see `## External dependencies` for the three
   citations. The per-field shape stands, its source does not. What is left for the design is which
   replacement source: the host naming the blocks in the plugin option, or a lazy read from the
   sanitized config at run time. Matters because: a lazy read makes the language's configuration
   depend on a live Payload instance, which the languages are built to be free of, while a host-named
   list reintroduces by hand what the editor already knows and can drift from it silently.
2. **Write-back at a crossing** *[non-blocking]* — whether handing over the target tree (both
   fixtures) or a clone of the source (shipped) is the contract. Matters because: the first amends
   an existing translation and the second replaces it, and a host that picks the wrong one produces
   either stale fragments or lost editor edits, with no error either way.
3. **Failure & error states** *[non-blocking]* — with C1, what happens when a format supplies an
   identity the host does not recognise. Today both resolvers answer `null` and the embed is skipped
   silently, by decision. Matters because: C2 moves the allow-list per field, which multiplies the
   chances of a block missing from one field's list and nobody being told.
4. **Empty and first-run states** — answered: a language with no crossings configured collects its
   own leaves and reports an unenterable rich text through `onSelectedWithoutText`, asserted in
   `src/languages/__tests__/PayloadFields.noRichTextCrossing.test.ts`.
5. **Boundaries and limits** — answered: crossing depth is bounded by `maxCrossings` (default 8,
   `TooManyCrossingsError`) and repetition by the cycle guard; `fixtures/harness.ts` exercises five
   levels at two crossings each.
6. **Permissions and roles** — N/A for this seam. The nearest thing to a permission is the host's
   consent to translate a field, which stays with the host in every implementation.
7. **Concurrency, idempotency, migration** *[non-blocking]* — C2 changes the shape of an option that
   has not shipped yet, so there is no migration today, and there is one the moment the major is
   released. Matters because: the window in which C2 is free closes when the swap publishes.

**Restate check.** *Crossing* — a handover of one value from the language that holds it to the
language that can read it, named by language id and carrying an opaque context; confirmed against
`contract.ts`. *Embed* — a node inside a rich-text tree whose content is written in the host's own
field vocabulary rather than the editor's; confirmed against both format languages. *Host* — the
language that owns the document's outer structure and the consent rules; confirmed, though note that
the word does not appear in `contract.ts`, which knows only languages — the host/format distinction
is a convention of `src/languages/`, not of the kernel, and nothing enforces it.

## Risks & Constraints

- **C2 is time-boxed by the release, not by effort.** The option it reshapes is published by the
  swap; after that the shape is a promise in a major.
- **The fixtures are the kernel's test coverage, not examples.** Aligning them must not change which
  cases they exercise — `fixtures/harness.ts` deliberately drives five levels of nesting, container
  and per-node cuts, and id-paired versus index-paired elements.
- **Two of the findings are about documentation rather than code** (F6's claim, F3's silence). The
  repair for those is a corrected docblock and a stated contract, and neither is improved by adding
  a parameter nobody configures.
- **The host/format distinction has no enforcement.** Any language may implement `boundary` and any
  may be entered as a walk's entry point; the kernel neither knows nor checks. A design that leans
  on the distinction should say so rather than assume it.

## Consistency self-check

No acceptance criterion contradicts an OUT requirement: AC1–AC7 all describe findings, not changes,
and AC8 pins the read-only constraint. Every criterion names a check. The coverage scan left nothing
both unanswered and unlisted. R10 is the one inferred requirement and it is worth keeping, because
without it the natural next move is to make six fixtures look alike and delete the cases they were
written to hold.

## Readiness

- Unresolved `[blocking]` questions: **0**
- IN requirements with no acceptance criterion: **0**

Soft, but not blocking: Open Question 1 decides whether C2 is implementable in the shape the
fixtures point at, and it is answerable only by reading how the schema map is built at boot — work
that belongs to the design, not to this audit.

## Decisions by the owner

- 2026-11-06 — F2 is accepted: crossing configuration belongs to the content position, not to the
  language instance. Where it is read from is reopened by the external-dependency finding above and
  is the design's first question.

## Suggested Next Step

**Ready for `/sp-architect`.** Likely vectors:

| Vector | Why |
|---|---|
| `contract` | C1 and C3 reshape a seam two languages meet at, and one of them is published |
| `evolution` | C2 changes an option that is about to ship in a major; after that it carries data and promises |

Not `structure only`: the question is not where code lives but what two sides promise each other.
