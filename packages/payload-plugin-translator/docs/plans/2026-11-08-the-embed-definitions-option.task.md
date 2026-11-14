# The embed definitions option

Build step: 2026-11-06-the-swap.design.md #1

To translate the text inside a block embedded in a rich text, the walk needs that block's field
definitions — the data only says `blockType: "cta"`, and without definitions there is no way to tell
a translatable heading from a URL. This step decides where those definitions come from and resolves
them once, at config-build time.

## Requirements

- R1 (in) Definitions come from two sources merged into one table: `payloadConfig.blocks`, and a new
  plugin option for blocks the package cannot see.
- R2 (in) The option is additive. It says "here are definitions you cannot see", never "translate
  only these", so the translated set is always everything resolvable.
- R3 (in) The host keeps one table keyed by slug, not one per embed kind, and the kind an embed
  declares stops deciding the lookup.
- R4 (in) The definitions survive Payload's in-place sanitizer, so a block's nested `localized` is
  still readable when a walk runs.
- R5 (out) Constructing the languages and running the pipeline through them. That is build step 3.

## Why the option is additive, and takes objects only

Settled by the owner on 2026-11-08, recorded here because the shape would otherwise look arbitrary.

**Additive, not narrowing.** A narrowing list fails silently — a block left out is text that stays
in the source language with no error — and silent omission is the defect this epic exists to
remove. Policy exclusion is already expressible: `exclude: true` on a field inside the block says
"never translate this" once, for every field that embeds it.

**Objects, not slugs.** A slug would be resolved against `payloadConfig.blocks`, which this package
already reads, so a slug here would do nothing. A parameter that does nothing is worse than an
absent one, and accepting one would need a boot refusal for an undefined slug — removed on
2026-11-08 for its own reasons.

**One table, not two.** Payload keeps `blocks` and `inlineBlocks` apart because its editor must know
what to offer where. This package needs only definitions, and which kind is actually present comes
from the data. A caller copying from their own editor configuration writes `[...blocks,
...inlineBlocks]`.

**A block declared in neither source is unknown, and that is not a defect.** It is the contract
Payload itself has: you declare what you want known. The option's documentation says so plainly.

## Decisions

### D1. The definitions are projected, not passed through raw

`sanitizeFields` deletes `localized` **in place** on any field under a localized ancestor, and a
rich-text field that embeds blocks is localized. A block handed to the host by reference would
therefore lose the one flag the host reads to decide what is translatable, somewhere between config
build and the first walk. The merged list is projected by value through `projectFieldsToFieldLike`,
exactly as collection schemas already are and for exactly the same reason.

- *Rejected — pass the blocks straight through.* It reads a flag the framework will have deleted.
- *Rejected — a new projection helper for blocks.* `projectFieldsToFieldLike` already projects a
  field list by value with a cycle guard; a block is a slug plus a field list.

### D2. The table is built in `plugin.ts` and carried beside the schema map

The projection must happen before Payload sanitizes, which is what forces `schemaMap` to be built in
`plugin.ts` rather than later. The same timing binds the definitions, so they are resolved in the
same place and travel on the same bag — `TranslateDocumentDeps`, which is what build step 3 reads
when it constructs the pipeline.

- *Rejected — resolve it in step 3 from the raw option.* By then the sanitizer has run and the
  definitions are the mutated ones. The placement is forced by timing, not by taste.
- **Stated plainly: the new member has no reader until build step 3.** That is this design's own
  sequencing — step 1 is specified as "no behaviour change, nothing calls the languages yet" — and
  the option is inert until then. Nothing is released from this branch in between, so no installed
  consumer can meet an option that does nothing.

### D3. A slug in both sources resolves to the option's definition

The option exists to supply what the global list cannot. If an author passes a block that is also
declared globally, the one they passed here is the more deliberate statement, so it wins.

### D4. `@since 1.0.0`

Read from the branch rather than guessed: the published train is `1.0.0-next.9`, the branch carries
`feat!` commits toward the major, and the options added on it already carry `@since 1.0.0`.
Resolves the swap design's open question O3.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | The plugin accepts `embeds` and a block passed there is resolvable by the host | a test building the table from a config with `embeds` and asking the host's resolver for that slug | the block's fields come back |
| AC2 | R1 | A block declared only in `payloadConfig.blocks` is resolvable with no option at all | the same test with no `embeds` | the block's fields come back |
| AC3 | R2 | Passing `embeds` does not narrow: a globally declared block stays resolvable beside it | a test with one block in each source, asking for both | both resolve |
| AC4 | R3 | An embed that names no kind resolves by slug | `PayloadFields.embedFlow.test.ts`, inverted — see Risk notes | the crossing is returned and the text is collected |
| AC5 | R3 | `PayloadFieldsConfig` carries one block member | `grep -c inlineBlocks` over `PayloadFields.language.ts` | 0 |
| AC6 | R4 | A block's nested `localized` survives the sanitizer deleting it in place | a test that projects, then deletes `localized` on the source block's fields, then reads the table | still `true` |
| AC7 | R1 | A slug in neither source resolves to nothing, with no error | a test asking for an unknown slug | `null`, nothing thrown |
| AC8 | D3 | A slug in both sources resolves to the option's definition | a test declaring the same slug in each with different fields | the option's fields come back |
| AC9 | — | Nothing already passing breaks | `bunx vitest run` | 220 files or more, no failures |
| AC10 | — | No type errors | `bun run check-types` | exit 0 |
| AC11 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC12 | — | The package still builds with the real declaration emitter | `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root | exit 0 |
| AC13 | — | The sandbox still boots and translates against the rebuilt `dist` | `bun run test:integration:sqlite` in `apps/dev` | 248 passed, 7 skipped |

## Pre-flight

| AC | Result against the untouched tree | Kind |
|---|---|---|
| AC1, AC3, AC8 | no `embeds` option exists (`grep -c embeds src/plugin.ts` → 0) | change — fails now |
| AC2 | `payloadConfig.blocks` reaches the projection but never reaches the host's table | change — fails now |
| AC4 | the suite asserts the opposite today: "gets no crossing, even for an embed whose name is in one of the lists" | change — fails now, and the assertion is inverted by the owner's decision, not weakened |
| AC5 | `inlineBlocks` appears 4 times in the host language | change — fails now |
| AC6 | no such coverage exists for this path | change — fails now |
| AC7 | an unknown slug already resolves to `null` | invariant — passes now |
| AC9 | 220 files, 2630 passed, 9 skipped | invariant — passes now |
| AC10 | exit 0 | invariant — passes now |
| AC11 | 34 warnings, 0 errors | invariant — passes now |
| AC12, AC13 | exit 0 · 248 passed, 7 skipped | invariant — passes now |

## Risk notes

Classified **low**. Nothing published is in use from this branch, `payloadFieldsLanguage` has no
production caller yet, and the change adds an optional member to a config that is only read by
tests. The projection it reuses is already covered.

- **AC4 inverts an existing assertion, and that deserves naming.** `PayloadFields.embedFlow.test.ts`
  currently pins "a format that names no kind gets no crossing". The owner's decision makes the
  opposite correct, because the refusal existed only to avoid guessing between two lists and there
  is now one. The test is rewritten to pin the new rule, not deleted — a format that names no kind
  must now *succeed* by slug, and that is a stronger claim than the one it replaces.
- The one real hazard is D1: a block whose `localized` is read after the sanitizer ran is a field
  that silently stops being translated. AC6 is its guard and earns a mutation.
- `src/core` may not import Payload types, so the merge takes structural `BlockLike`, and `plugin.ts`
  passes Payload's `Block` to it by assignability.

## Review

Filled by the verification pass; the run log lives beside this file.

## Decisions by the owner

2026-11-08 — definitions come from `payloadConfig.blocks` plus an additive `embeds` option taking
block objects only; one table keyed by slug rather than one per embed kind; a block declared in
neither source is simply unknown, which is the same contract Payload itself has and is documented
as such rather than apologised for.
