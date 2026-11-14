# The declaration withdrawn

Amends: 2026-11-06-the-crossing-surface.design.md — R2 and R4 are withdrawn by the owner.

A field could declare which formats may take its value over and which embeds they may enter. Both
halves are removed. The plugin-level lists become the only place either is configured.

## Why, on the record

**The formats half never earned its place.** A format recognises its own value by shape — the
crossing list is iterated and each entry answers for itself — so narrowing the list per field adds
no capability. "Refuse this format here" and "do not translate this field" are the same observable
state, because a rich-text value is a tree and the host yields no text units for one
(`PayloadFields.language.ts`, `textUnits`); `exclude: true` already says it, in one published word.

**The embeds half costs more than it buys.** Resolution is by slug, and the slug is the identity
Payload itself writes into the stored data. The frequent difference between fields — their editors
allow different blocks — never reaches the walk: a slug absent from a field's data never resolves,
so a global list that is a superset costs nothing. The only case a per-field list expresses is the
same block translated in one field and not in another, which is a property of the block rather than
of its position, and which `exclude: true` inside the block states once for everywhere.

**The two errors are not symmetric.** A global list that is too broad translates a block that is
present — visible, and correctable. A per-field list that is too narrow skips text silently, which
is the defect the audit behind this design was opened for.

## Requirements

- R1 (in) No field-level channel configures crossings. `custom.translateKit.crossing` is read by
  nothing; a configuration still carrying one is inert, not an error.
- R2 (in) `PayloadFieldsConfig` — `crossings`, `blocks`, `inlineBlocks` — is the only surface.
- R3 (in) What the declaration work found and fixed outside itself survives: the projection's
  cycle safety, `exclude: true`, and composing two `withFieldTranslation` calls.
- R4 (out) The swap's own plugin option (the design's open question O-B). Untouched here.

## Decisions

### D1. `TRANSLATE_KIT_CUSTOM_KEY` returns to the domain layer

It moved into the kernel so the projection could read `custom.translateKit.crossing` without an
upward import. That reader is deleted, and after it no kernel file reads the key — so it returns to
`core/domain/field-config/types.ts`, where it lived before, and `declaration.ts` is deleted whole.

- *Rejected — keep `declaration.ts` holding only the key.* The filename would promise a declaration
  that no longer exists, and the kernel barrel would publish a name no kernel file reads, which the
  package's barrel rule forbids.

### D2. The projection's cyclic fill reverts to assignment

`sharedBlock` registers an empty block before projecting its fields, then fills it. It was changed
to fill the array in place because the declaration resolver stored `block.fields` — the array
itself — in its lookup, so a reassignment left that lookup holding the empty seed. With the
resolver deleted, every remaining holder keeps the block *object*, through which an assignment is
visible, and the comment explaining the in-place fill would name a caller that no longer exists.

- *Rejected — keep filling in place.* It would leave a comment describing a deleted caller, which
  is worse than none; and the behaviour is identical for every holder that remains.
- **This is the one behaviour change on a path that is not itself being deleted**, so it is the
  risk this contract carries, and AC5 is its guard.

### D3. `withFieldTranslation` keeps composing, and loses the rest

The per-key merge (`{ ...getFieldTranslationConfig(field), ...config }`) and the `exclude` gate
reading the merged result are kept: without them a second call replaces `custom.translateKit`
wholesale, so wrapping an already-excluded field silently un-excludes it. That defect is
independent of the declaration.

Everything else in that file returns to its earlier shape: the `{ crossing }` overload, the
`DeclaringConfig` type, and the `carriesControl` runtime guard with its type tuple. Once no
configuration but `{ exclude: true }` can reach a field that bears no control, the guard is
unreachable through the typed surface it defends.

- *Rejected — revert the file whole.* It would restore the composition defect above.
- *Rejected — keep `carriesControl`.* Eight lines guarding a case the overload already refuses.

### D4. The records are amended, not rewritten

The design keeps its text and gains a withdrawal note naming what is withdrawn and why. The three
build-step contracts are marked withdrawn in place.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | No declaration type survives anywhere in the source | `grep -rl "FieldCrossingDeclaration\|FieldEmbeds\|FieldContent\|EmbedDefinition" src` | no files listed |
| AC2 | R1 | The four files that existed only for the declaration are gone | `ls` of `declaration.ts`, `unresolvedEmbedSlugs.ts`, `declaration.pins.ts`, `projectFieldLike.declaration.test.ts` | none exists |
| AC3 | R1 | A field still carrying `custom.translateKit.crossing` narrows nothing | a test walking a document whose field declares `embeds: "none"` while the plugin lists the block | the block's text is collected |
| AC4 | R2 | The plugin's own list is what the host enters blocks from | the same test, for a field declaring nothing | the block's text is collected |
| AC5 | R3 | A self-referential shared block still terminates and resolves filled | three cases in `projectFieldLike.test.ts`, one mutation to prove they discriminate | terminates; fields are `["heading","inner"]`; inner is the same object |
| AC6 | R3 | Composing two calls keeps a key the second does not name | a case in `field-config.test.ts` | an excluded field wrapped again stays excluded and grows no control |
| AC7 | R3 | `exclude: true` still excludes and suppresses the control | the existing `field-config` suite | passes |
| AC8 | — | The suite drops only by what was deleted | `bunx vitest run` | 220 files, 2630 passed, 9 skipped |
| AC9 | — | No type errors | `bun run check-types` | exit 0 |
| AC10 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC11 | — | The package still builds with the real declaration emitter | `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root | exit 0 |
| AC12 | — | The sandbox still boots and translates | `bun run test:integration:sqlite` in `apps/dev` | 248 passed, 7 skipped |

## Pre-flight

| AC | Result against the untouched tree | Kind |
|---|---|---|
| AC1 | 13 files match | change — fails now, as it must |
| AC2 | all four exist | change — fails now |
| AC3 | the declared field collects `["Intro"]`, the block is dropped | change — fails now, output quoted in the review log |
| AC4 | the undeclared field collects `["Intro","Buy"]` | invariant — passes now |
| AC5 | passes; no such case existed before, so this adds the only guard | invariant — passes now |
| AC6, AC7 | the existing suite passes | invariant — passes now |
| AC8 | 222 files, 2660 passed, 9 skipped | invariant — passes now |
| AC9 | exit 0 | invariant — passes now |
| AC10 | 34 warnings, 0 errors | invariant — passes now |
| AC11, AC12 | exit 0 · 248 passed, 7 skipped | invariant — passes now |

### How AC8's number is reached

| Change | Files | Cases |
|---|---|---|
| baseline | 222 | 2660 |
| `projectFieldLike.declaration.test.ts` deleted | −1 | −10 |
| `PayloadFields.readsTheDeclaration.test.ts` deleted | −1 | −6 |
| `plugin.unresolvedEmbeds.test.ts` deleted | −1 | −9 |
| declaration cases cut from `field-config.test.ts`, one kept rewritten | — | −5 |
| three source files leave the `no-payload-boundary` parametrisation | — | −3 |
| two of those three also leave the `every-throw-is-a-translator-error` sweep, which skips `__tests__` and so does not count `declaration.pins.ts` | — | −2 |
| `PayloadFields.globalEmbedLists.test.ts` added | +1 | +2 |
| cycle cases added to `projectFieldLike.test.ts` | — | +3 |
| **expected** | **220** | **2630** |

The `−2` row was missed when this table was first written: two suites parametrise over source
files, not one. Corrected against the measured result, with the second sweep's scope named rather
than the difference absorbed.

## Risk notes

Classified **low**. Nothing published is in use: `src/index.ts` exports neither the declaration nor
any type reaching it, `payloadFieldsLanguage` has no production caller yet, and neither sandbox app
mentions `translateKit.crossing`. The deletion removes a channel nothing reads.

- The single real hazard is D2, because it touches the projection, which every collection's schema
  goes through at boot. AC5 is its guard and earns a mutation.
- `FieldTranslationConfig.crossing` is removed from a published interface. It shipped in no release
  — the version carrying it is unreleased — so no installed consumer can name it.

## Review

Filled by the verification pass; the run log lives beside this file.

## Decisions by the owner

2026-11-08 — decided by the owner: remove both halves of the per-field crossing declaration and
keep the plugin-level lists as the single source, accepting the loss of per-field narrowing.
Simplicity is preferred to flexibility here, and the rarity of the case the declaration served does
not justify the surface it costs.
