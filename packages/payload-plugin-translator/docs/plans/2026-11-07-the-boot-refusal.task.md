# The boot refusal

Build step: 2026-11-06-the-crossing-surface.design.md #6

> **WITHDRAWN — 2026-11-08.** This step was built, verified, and then undone: the refusal that guarded that channel's slugs no longer
> exists. The owner decided that crossings are configured once, at plugin level, and that the
> per-field declaration did not earn the surface it cost. The reasoning is in the design's
> *Withdrawal* section; the removal is `2026-11-08-the-declaration-withdrawn.task.md`. What follows
> is kept as the record of a step that was taken and reversed — do not build from it.


A field declares the embeds it allows by slug. A slug nothing defines is dropped by the projection
without a word, and at walk time "not in the list" is indistinguishable from "the author did not
list it" — which the design decided must stay silent, because silence there is consent.

That decision only holds if typos cannot reach walk time. This step is the other half of the pair:
**typos die at boot, consent stays silent.**

## Requirements / Task restatement

- R4 (in) A declared embed slug that resolves to no definition refuses the config at build time,
  naming the collection, the field path and the slug. A valid config boots unchanged.
- R4 (partial, deferred) The other half of the same refusal — a `formats` entry naming no
  registered crossing — cannot be built yet. It needs the configured crossing list, which is the
  design's open question O-B and belongs to the swap's own first build step. Recorded below rather
  than half-built.

## Why only half, and why that half is still worth building

The two refusals look alike and are not. An unresolvable slug can be decided from the schema alone:
the declaration is on the field, the resolved lookup is beside it, and the difference between them
is the answer. An unknown format id can only be decided against the list of crossings the plugin
was configured with, and no such option exists — nothing in `TranslatorPluginConfig` carries one.

Building the format half now would mean inventing the option this step does not own, or validating
against an empty list and refusing every declaration. Both are worse than waiting.

## What already exists — platform · installed · project · verdict

`plugin.ts` already builds the projected schema map and already refuses an unusable config beside
it, with two existing refusals to match in shape and wording.

**`walkFields` cannot be reused for this, and the reason is worth recording** — an earlier draft of
this section claimed it could, and the next reader would have rewritten the scan back onto it.
Three independent blockers, each fatal on its own: it walks schema *in step with data*, and at
config time there is no document, so a `blocks` field yields no children and no block is ever
entered; its leaf callback is narrowed to `LeafFieldLike`, so a declaration sitting on a group or
an array never reaches it; and it has no cycle guard, while a projected tree is cyclic by design —
a shared block is projected once and reused — which the self-referential declaration case would
hit immediately.

So this step builds a small schema-only walk with its own `seen` guard. That is new code, and the
alternative is recorded here rather than left to be rediscovered.

## Decisions

### D1. The check reads the declaration from the field, not from a report the projection keeps

The projection drops an unresolvable slug silently and keeps no record. Rather than teach it to
report, the check compares what the field declared — still on `custom`, copied by reference — with
what landed in `content`. A slug in the first and not the second is the defect.

- *Rejected — have the projection collect unresolved slugs.* It would give a pure projection a
  second output and a reason to care about reporting, for one caller that can already compute the
  difference.
- *Rejected — refuse inside the projection.* It runs for every consumer of a schema, not only at
  boot, and a throw there turns a read into a failure far from the config that caused it.

### D2. One pass, after the map, beside the refusals already there

It walks the schema map the plugin has just built, so it sees exactly the fields the plugin will
translate — including blocks resolved through `blockReferences`.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R4 | A declared block slug nothing defines refuses the config, naming collection, field path and slug | a test building a config whose field declares an undefined slug | throws, and the message contains all three |
| AC2 | R4 | The same for an inline block list | the same test with `inlineBlocks` | throws with the slug named |
| AC3 | R4 | A declaration whose slugs all resolve boots unchanged | a test with a defined slug and one with an inline definition written out | does not throw |
| AC4 | R4 | A field that declares nothing boots unchanged | the existing plugin suites | exit 0, same case count |
| AC5 | R4 | `"none"` is not a slug and is never reported as unresolvable | a test over a field declaring `embeds: "none"` | does not throw |
| AC6 | — | Nothing already passing breaks | `bunx vitest run` | 221 files or more, no failures |
| AC7 | — | No new type errors | `bun run check-types` | exit 0 |
| AC8 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC9 | — | The sandbox app still starts | `bun run test:integration:sqlite` in `apps/dev` | 248 passed, 7 skipped |

## Pre-flight

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1, AC2, AC5 | the tests above | no such check exists; an unresolvable slug is dropped silently | change — must fail now, and does |
| AC3, AC4 | the existing plugin suites | exit 0 | invariant — passes now |
| AC6 | `bunx vitest run` | 221 files, 2647 passed, 9 skipped | invariant — passes now |
| AC7 | `bun run check-types` | exit 0 | invariant — passes now |
| AC8 | `bunx oxlint .` | 34 warnings, 0 errors | invariant — passes now |
| AC9 | the integration suite | 248 passed, 7 skipped | invariant — passes now |

## Risk notes

Classified **high**: it can refuse to boot an application that boots today. A false positive is an
outage, not a missing translation.

- The one way to get a false positive is to treat something that is not a slug as one — `"none"`,
  or an inline definition written out. AC3 and AC5 are those two.
- The check must see the same fields the plugin will translate, including blocks reached by
  reference, which is why it reads the projected map rather than the raw config.

## Review

Filled by the verification pass; the run log lives beside this file.

## Decisions by the owner

2026-11-07 — decided by the owner: work the build sequence autonomously, taking the optimal
decision at each fork rather than stopping to ask, and commit nothing.
