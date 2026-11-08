# The field declaration

Build step: 2026-11-06-the-crossing-surface.design.md #4

> **WITHDRAWN — 2026-11-08.** This step was built, verified, and then undone: the field-level channel it added no longer
> exists. The owner decided that crossings are configured once, at plugin level, and that the
> per-field declaration did not earn the surface it cost. The reasoning is in the design's
> *Withdrawal* section; the removal is `2026-11-08-the-declaration-withdrawn.task.md`. What follows
> is kept as the record of a step that was taken and reversed — do not build from it.


Today a rich-text field cannot say which blocks may be translated inside it. The plugin will hold
one default list for every field, and two rich-text fields in one collection legitimately allow
different blocks. This step builds the channel a field declares through, and resolves what it
declares once, at config-build time, into a shape the host can read per crossing without doing work.

Nothing reads the result yet — that is step 5.

## Requirements / Task restatement

The ids below are this file's own. Against the design's list, they cover its **R2** (what a field
may declare) and its **R5** (resolved at most once per collection-and-field, never per crossing).

- R1 (in) A field can declare which formats may take it over and which embeds they may enter,
  through `custom.translateKit.crossing`.
- R2 (in) The declaration resolves once, at config-build time, into prebuilt lookups on the
  projected field; a crossing pays one lookup and no construction.
- R3 (in) A declared block definition is projected by value through the existing block path, so its
  nested `localized` survives Payload's in-place sanitizer.
- R4 (in) A declaration that names a list replaces the default for that list and inherits the other;
  an empty list must be written, never implied, and `{}` must not be expressible.
- R5 (in) The published writer `withFieldTranslation` merges into an existing declaration instead of
  replacing it, and decides on injecting the translate control from the field's type at run time
  rather than from an overload.
- R6 (out) Reading the resolved declaration in `payloadFieldsLanguage` — step 5.
- R7 (out) Refusing an unknown format id or an unresolvable slug at boot — step 6.
- R8 (out) The plugin option that supplies the default lists — the swap's own first step.

## What already exists — platform · installed · project · verdict

- **Project.** `FieldProjection` already owns slug resolution, the shared-block memo and the cycle
  guard, and already copies `custom` by reference. The declaration resolves there, through
  `block()`/`sharedBlock()`, rather than through anything new.
- **Project.** `getFieldTranslationConfig` already reads `custom.translateKit` defensively — but it
  lives in the domain, and D1 of the design forbids the kernel from importing the domain to name
  its own input. So the projection gets a second, smaller reader of the same untyped bag. That is
  a real duplication, accepted for the layering it buys and recorded rather than hidden; the deeper
  repair is to move the defensive parse down beside the key and leave the domain function a thin
  typing over it, which rewrites a file older than this change.
- **Platform / installed libraries.** Nothing here is a library's job; no search.

Verdict: no new mechanism. New types, one new member, and a resolver inside the class that already
holds the state it needs.

## Decisions

D1, D2, D5 and D6 of the design are adopted and not reopened: the carrier is
`custom.translateKit.crossing`; the key and the declaration types live in the kernel; the resolved
form is prebuilt Maps on `FieldLike.content`; a field's list replaces the default per list and
`FieldEmbeds` has no `{}` inhabitant. What follows is what this step had left to decide.

### D1. A shared block's projected fields are filled in place, not reassigned

`sharedBlock` seeds `{ slug, fields: [] }` into the memo and then **reassigns** `fields`. Anything
that captured the array during the cycle holds the empty one forever. Nothing captured it before —
the existing path stores the `BlockLike` and reads `.fields` later — but the resolver here stores
`FieldLike[]` directly, because that is what a host needs and what `FieldContent` is specified as.

So the fill becomes in-place. One line, and it makes the memo honest for any future capture too.

- *Rejected — store `BlockLike` in the Maps and read `.fields` at crossing time.* It sidesteps the
  reassignment but contradicts the resolved shape the design specifies, and pushes a dereference
  onto the walk that the whole point was to pay once.
- *Rejected — resolve declared blocks outside the memo.* A self-referential declaration would then
  not terminate, and a shared block would be projected twice.

### D2. The non-candidate overload demands a declaration that says something

`withFieldTranslation` required `{ exclude: true }` on a field that cannot carry a control. With a
second member that requirement becomes wrong — a `json` field may legitimately declare a crossing
and nothing else — but dropping it entirely would let `withFieldTranslation(jsonField, {})` through,
a call that does nothing and reads as if it did.

The rest parameter therefore demands `FieldTranslationConfig` narrowed to one that excludes or
declares. Today's call shapes keep today's behaviour exactly.

- *Rejected — widen to `FieldTranslationConfig`.* It admits the empty call.
- *Rejected — keep the overload as the control gate and add a second overload.* D2 of the design
  rejects exactly this: the gate must be a runtime check on the field's type, because an overload
  cannot see the type of a field built at run time.

### Placement

| Piece | Lands in | Why there |
|---|---|---|
| `TRANSLATE_KIT_CUSTOM_KEY`, `LanguageId`, `EmbedDefinition`, `FieldEmbeds`, `FieldCrossingDeclaration`, `FieldContent` | `src/core/kernel/field-traversal/declaration.ts` | the kernel resolves it, so the kernel must not import the domain to name it |
| `FieldLike.content` | `src/core/kernel/field-traversal/types.ts` | beside the input-only `blockReferences` it mirrors |
| the resolver | `src/core/kernel/field-traversal/projectFieldLike.ts` | the one place holding slug resolution, the memo and the cycle guard |
| `FieldTranslationConfig.crossing` | `src/core/domain/field-config/types.ts` | the published authoring type, re-exporting the kernel's declaration |
| the merge and the runtime control gate | `src/field-config.ts` | the published writer |

New surface: six types, published only as far as `FieldTranslationConfig.crossing` reaches them by
contextual typing. Shape-check triggers fired — a member added to a published type, a new optional
member on `FieldLike`, and a changed parameter on a published function — and each is compared in
D1, D2 above or in the design's D2, D5 and D6.

Escalate? No — this is build step 4 of a design that decided it.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1, R4 | The three spellings resolve to the stated effective lists: absent inherits both, `"none"` empties both, an object replaces each list it names and inherits each it omits | a test over `projectFieldsToFieldLike` asserting `content` for each spelling | exit 0, all four cases run |
| AC2 | R4 | `{}` cannot be written as an `embeds` declaration | a `@ts-expect-error` pin on `embeds: {}` | `bun run check-types` exits 0 with the pin in place |
| AC3 | R3 | A declared inline block definition keeps its nested `localized` after the source objects are mutated the way Payload's sanitizer mutates them | a test that projects, then deletes `localized` on the source, then reads the resolved Map | exit 0, the case runs |
| AC4 | R2, D1 | A declaration that names itself by slug terminates, and the fields it resolves to are the filled ones, not the empty seed | a test with a shared block whose own field declares that same slug | exit 0, the resolved fields are non-empty |
| AC5 | R2 | Resolution happens at projection, not per crossing | a test asserting two reads of `content.blocks` return the same `Map` instance | exit 0, the case runs |
| AC6 | R5 | A crossing declared on a field that cannot carry a control adds no admin component | a test calling `withFieldTranslation` on a `json` field with only a crossing | exit 0, the returned field has no `admin.components` |
| AC7 | R5 | Two composed calls preserve both members instead of the second replacing the first | a test composing `{ exclude: true }` and `{ crossing: … }` | exit 0, both members present |
| AC8 | R5 | Today's call shapes keep today's behaviour | the existing `withFieldTranslation` suite, unchanged | exit 0, same case count |
| AC9 | R2 | The kernel does not import the domain to name the declaration | `grep -rn "domain/" src/core/kernel/ \| wc -l` | prints `0` |
| AC10 | — | Nothing already passing breaks | `bunx vitest run` | 219 files or more, no failures |
| AC11 | — | No new type errors | `bun run check-types` | exit 0 |
| AC12 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC13 | — | Both apps still type-check | `bunx turbo run check-types --force` from the repo root | 9 successful, 9 total |

## Pre-flight

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1, AC3–AC7 | the tests above | no such tests; `FieldLike` has no `content` and `FieldTranslationConfig` no `crossing` | change — must fail now, and does |
| AC2 | the pin above | nothing to pin: no `FieldEmbeds` exists | change — must fail now, and does |
| AC8 | the existing suite | exit 0 | invariant — passes now |
| AC9 | the grep above | prints `0` | invariant — passes now, and must stay |
| AC10 | `bunx vitest run` | 219 files, 2624 passed, 9 skipped | invariant — passes now |
| AC11 | `bun run check-types` | exit 0 | invariant — passes now |
| AC12 | `bunx oxlint .` | 34 warnings, 0 errors | invariant — passes now |
| AC13 | `bunx turbo run check-types --force` | 9 successful, 9 total | invariant — passes now |

## Risk notes

Classified **high**: it adds a member to a published type and changes a published function's
parameter, and it edits the projection every collection's schema passes through.

- The projection is load-bearing for a defect that is invisible when reintroduced: Payload deletes
  `localized` in place on fields under a localized ancestor, and a declaration resolved by reference
  rather than by value would lose it. AC3 is that guard.
- `sharedBlock`'s in-place fill changes an array's identity semantics in code that already has a
  cycle test. The existing `projectFieldLike.blockReferences.test.ts` must stay green unchanged.
- `withFieldTranslation` is published and its overload is what users see. Widening it wrongly would
  make a previously refused call compile; AC2 and the unchanged existing suite bound that.

## Review

Filled by the verification pass; the run log lives beside this file.

## Decisions by the owner

2026-11-07 — decided by the owner: work the build sequence autonomously, taking the optimal
decision at each fork rather than stopping to ask, and commit nothing.
