# The host reads the declaration

Build step: 2026-11-06-the-crossing-surface.design.md #5

> **WITHDRAWN — 2026-11-08.** This step was built, verified, and then undone: the host's reading of that channel no longer
> exists. The owner decided that crossings are configured once, at plugin level, and that the
> per-field declaration did not earn the surface it cost. The reasoning is in the design's
> *Withdrawal* section; the removal is `2026-11-08-the-declaration-withdrawn.task.md`. What follows
> is kept as the record of a step that was taken and reversed — do not build from it.


The previous step resolved what a field declares into prebuilt lookups on the projected field.
Nothing reads them. This step makes the host prefer a field's own lists over its configured
defaults, and narrow its crossing list to the formats a field allows.

With it, two rich-text fields in one collection can allow different blocks — the case that is
inexpressible today.

## Requirements / Task restatement

The design's requirement ids are kept as they are; this step is where two of them become true at
the point of use.

- R2 (in) Which language may take over a field's value, and which embeds it may enter, are settable
  per field — here, read by the host: a declared list replaces the default for that list, a field
  that declared nothing behaves exactly as today, and `formats` narrows which entries are offered.
- R5 (in) A field's embed definitions are a lookup built at most once per collection-and-field per
  process, never per crossing — here, read rather than rebuilt.
- R4 (out) Refusing an unknown format id or an unresolvable slug at boot — step 6.
- R8 (out) The plugin option supplying the defaults — the swap's own first step.

## What already exists — platform · installed · project · verdict

The host already builds its default lookups once in the factory and already consults them in one
place. The field's resolved lookups arrive on the field it is already handed. Nothing new is built;
the resolver moves from the factory into `boundary` so it can see the field.

## Decisions

### D1. Per list, not per declaration

A field that names `blocks` and not `inlineBlocks` gets its own blocks and the host's default
inline blocks. This is the design's D6 read at the point of use: the declaration replaces each list
it names and inherits each it omits, and `"none"` is already resolved into two empty Maps upstream,
so the host needs no case for it.

- *Rejected — a declared `embeds` replaces both lists wholesale.* It makes "I allow one more block
  here" cost a restatement of the other list, which is how a default drifts out of one place.

### D2. The resolver is built per boundary call, not per walk

It closes over the field's content, and a different field has different content. One closure per
crossing attempt is an allocation; a Map build would not be, and there is none.

- *Rejected — memoise a resolver per field.* It trades an allocation for a cache keyed on a
  projected object that lives as long as the process, which is a leak shaped like an optimisation.

### D3. An absent `formats` permits every entry; an empty one permits none

`formats` is a narrowing, so absence cannot mean "none" — that would silently stop translating
every field that never declared anything. An empty array is a declaration and means what it says.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R2 | Two rich-text fields in one collection with different declared lists translate different embeds | a test with two fields, each declaring one block the other does not | exit 0, each field yields only its own |
| AC2 | R2 | A field that declares one list inherits the host's default for the other | a test declaring `blocks` only, with an inline block in the host's default | exit 0, both are entered |
| AC3 | R2 | A field that declares nothing behaves exactly as today | the existing embedded-block suites, unchanged | exit 0, same case count |
| AC4 | R2 | `"none"` admits no embed, even one the host's default lists | a test over a field declaring `embeds: "none"` | exit 0, no embedded text is found |
| AC5 | R2 | A format the field does not name is never offered the value | a test with two entries and a `formats` naming one | exit 0, the unnamed entry's `open` is not called |
| AC6 | R2 | A field naming no `formats` is offered every entry, as today | a test asserting both entries are consulted | exit 0, the case runs |
| AC7 | R5 | No lookup is built while crossing | `grep -c "new Map" src/languages/PayloadFields.language.ts` outside the factory | prints `0` inside `boundary` |
| AC8 | — | Nothing already passing breaks | `bunx vitest run` | 220 files or more, no failures |
| AC9 | — | No new type errors | `bun run check-types` | exit 0 |
| AC10 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |

## Pre-flight

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1, AC2, AC4–AC6 | the tests above | no such tests; the host never reads `field.content` | change — must fail now, and does |
| AC3 | the existing suites | exit 0 | invariant — passes now |
| AC8 | `bunx vitest run` | 220 files, 2641 passed, 9 skipped | invariant — passes now |
| AC9 | `bun run check-types` | exit 0 | invariant — passes now |
| AC10 | `bunx oxlint .` | 34 warnings, 0 errors | invariant — passes now |

## Risk notes

Classified **low**: one function in one shipped file, with the defaults path unchanged for every
field that declares nothing — which is every field in the suite today, so AC3 is a broad guard.

The thing to watch is the direction of the preference. Reading the default where a field declared
an empty list would quietly translate embeds the author excluded, and no existing test would see
it, because no field declares anything yet. AC4 exists for that.

## Review

Filled by the verification pass; the run log lives beside this file.

## Decisions by the owner

2026-11-07 — decided by the owner: work the build sequence autonomously, taking the optimal
decision at each fork rather than stopping to ask, and commit nothing.
