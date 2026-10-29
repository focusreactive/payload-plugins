# One list of filters, not two fields

**Status:** awaiting approval · **Risk:** high · **Follows:** `2026-10-23-fields-not-a-strategy.task.md`, same branch, before any commit

## Requirements / Task restatement

The previous pass gave each target locale of a run two optional members: `selection`, a list of leaf
addresses, and `criteria`, names of rules that narrow it. Both answer one question — which leaves
does this run translate — and the handler has to say so twice: `selection ?? everything`, then
intersect each criterion's answer.

Make it one list. A filter is either the addresses themselves or the name of a rule that produces
them; the run translates the intersection of every filter's answer, and an empty list means every
translatable leaf.

```ts
{ kind: "leaves", addresses: ["title", "layout.b1:text.content"] }
{ kind: "rule",   name: "stale" }
```

**Behaviour does not change.** All four cases answer exactly as they do now:

| Today | After | Result |
|---|---|---|
| `selection: [a, b]` | `[{ leaves: [a, b] }]` | `[a, b]` |
| `criteria: ["stale"]` | `[{ rule: "stale" }]` | the drifted leaves |
| both | both filters | `[a, b]` ∩ drifted |
| neither | `[]` | every translatable leaf |

The intersection of no filters is everything, so the special case "a selection sets the starting
list" disappears rather than being re-implemented.

## What already exists — platform · installed · project · verdict

| Need | What already does it |
|---|---|
| a discriminated union parsed out of a JSON column | `SourceFingerprint` (`core/domain/provenance/SourceFingerprint.ts:28`) — zod, a `kind` tag, a parser that degrades rather than throws. The precedent to follow |
| intersect lists of addresses | `narrowSelection` (`core/domain/selection/`), unchanged |
| the starting list | `everyTranslatableLeaf` (`core/domain/content-projection/contentProjector.ts`), unchanged |
| refuse at the request | the enqueue route already refuses four ways |

Nothing new is built beyond the shape itself and the per-kind comparison in `covers`.

## Decisions

**D1 — one list, intersected; the two fields go.**
*Rejected: keep `selection` and `criteria`.* They are two mechanisms for one question, and the
asymmetry is written into every reader: the schema, `leavesToSend`, `covers`, and three refusals.
The intersection already expresses what `selection` did — a filter that vouches for exactly those
addresses — so the special case is removable rather than inherent.

**D2 — two kinds: `leaves` and `rule`.**
*Rejected: `kind: "stale"`, a union enumerating the rule names.* That puts provenance's word into a
type the plugin declares, which is the dependency the previous pass spent D5 avoiding. With a `rule`
kind the name stays opaque data, checked against what is registered rather than against a type.
*Rejected: `kind: "fields"`, as first sketched.* `SourceFingerprint` already uses `kind: "fields"` in
this codebase, for a different thing — how a receipt records the source. Two unions, one tag value,
two meanings is a collision a reader pays for. `leaves` is the word the rest of the code uses for
what an address names.

**D3 — filters resolve in the handler; the pipeline is untouched.**
`translateContent` keeps taking `selection: readonly string[]`, and `core/` does not change at all.
*Rejected: pass the filters down.* S1 of the rewiring plan says the pipeline takes one input, and a
filter that must ask provenance cannot run inside a pure core function.

**D4 — one ask covers another when every filter it carries is implied by one of theirs.**
For a `leaves` filter that means their addresses are a subset of ours; for a `rule` filter, the same
name. An ask carrying no filters covers everything; an ask carrying filters covers no empty ask.
*Rejected: compare the two lists for equality.* It would refuse `{leaves:[a,b]}` covering
`{leaves:[a]}`, which is a run that genuinely already serves the request.
*This is the same rule as today*, written once instead of once per member.

**D5 — the pre-1.0 shim produces a filter.** `skip_existing` becomes `[{ kind: "rule", name: "stale" }]`
and anything else becomes `[]`. Unchanged in meaning from the previous pass; only the shape moves.

### Placement

| Piece | Lands in | Why there |
|---|---|---|
| the filter union and its parse | `payload-jobs-runner/store/jobInput.schema.ts` | the one declaration the stored types and the registered Payload fields are both generated from |
| `covers` | `payload-jobs-runner/model/alreadyCovered.ts` | where it already is |
| resolving a filter to addresses | `translate-document/handler.ts` (`leavesToSend`) | the run is where "what do we translate" is decided (D5 of the previous pass) |
| the wire shape and its refusals | `enqueue-translation/{model.ts,handler.ts}` | refusals belong at the request |

### New surface — the shape check

Triggers fired: a field changes on a published type (`TaskInput`, `TaskHandlerInput`, the enqueue
input, the stored row); the new member is optional; an exported function changes shape.

| | `filters: Filter[]` (chosen) | `selection?` + `criteria?` (today) |
|---|---|---|
| cost of the next kind of narrowing | **1** — a member of the union and its resolver | **5** — a third optional field, plus a branch in the schema, `leavesToSend`, `covers` and the refusals |
| states admitted / produced | every state the union admits is produced | admits `{selection: [], criteria: []}` and three more combinations of two optionals for one question; the schema refuses some, the type allows all |
| second caller already in the repo | `leavesToSend` resolves, `covers` compares, the enqueue route validates | the same three |
| breaks for an implementor outside this repo | `TaskHandlerInput` and the stored row — **but neither has shipped**, which is the reason to do this now rather than after |

One shape survives on the first two rows.

### Written contract

Two units owe callers what a signature cannot state, so Phase 3 runs them red-first:

- **`covers`** — what "covers" means (the listed ask translates at least what the new one asks for),
  that it is deliberately conservative (it may answer false for an ask it does in fact cover, which
  costs a second run rather than lost work), and that no filters covers everything while any filters
  covers no empty ask.
- **the filter list** — an empty list means every translatable leaf, not none; order does not matter,
  because the result is an intersection.

### Escalate to `/sp-architect`?

No. One shape, five readers, all in this package, and the design came from the owner at the review.

## Acceptance Criteria

Run from `packages/payload-plugin-translator` unless stated.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | A request naming addresses translates those leaves | `bunx vitest run src/server/features/translate-document` | green |
| AC2 | A request naming a rule translates what the rule vouches for | same | green |
| AC3 | A request naming both translates the intersection | same | green |
| AC4 | A request naming no filters translates every translatable leaf | same | green |
| AC5 | A rule nothing answers to fails the run rather than widening it | same | the run rejects; no provider call |
| AC6 | A `leaves` filter sent with more than one document is refused | `bunx vitest run src/server/features/enqueue-translation` | 400 naming the restriction |
| AC7 | A `leaves` filter carrying a positional address is refused | same | 400 naming the address |
| AC8 | A `rule` filter nothing answers to is refused at the request | same | 400 listing the known names |
| AC9 | An empty filter list is accepted and means everything; an empty `addresses` is refused | same | 200 and 400 respectively |
| AC10 | One ask covers another exactly when it translates at least as much | `bunx vitest run src/server/modules/task-runner` | green, red-first against a stub |
| AC11 | A pre-1.0 `skip_existing` row reads as one `rule` filter named by provenance | same | green, and the literal is tied to provenance's own constant |
| AC12 | The registered Payload field list matches the schema | same | the regenerated baseline is what the generator produces |
| AC13 | The four cases behave end to end as they did before | `bun run test:integration` from `apps/dev`, after a rebuild | green |
| AC14 | Nothing else moves | `bunx vitest run` · `bun run check-types` · `bunx oxlint .` · `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root · `bun run test:integration` | ≥187 files / ≥2462 checks, 0 type errors, ≤43 warnings and 0 errors, build green, 56 integration files green |
| AC15 | `selection` and `criteria` are gone as separate members of an ask | `grep -rn "selection?: readonly\|criteria?: readonly" src --include="*.ts"` | no hit on an ask. Two stay and are not asks: the pipeline's own `selection` parameter (D3 keeps it), read back in `handler.test.ts` and `handler.criteria.test.ts` to see what was sent. (`wireTranslateRunner`'s `criteria?: Criteria` is the registry of answerers, a different thing, and stays) |

## Pre-flight — each check run against the current branch

| AC | Result now | Classification |
|---|---|---|
| AC1–AC5 | the cases exist and pass against `selection`/`criteria`; rewritten against `filters` they are a type error, because the member does not exist | **change** |
| AC6–AC9 | the refusals exist against `selection`/`criteria`; AC9's "empty filter list is accepted" cannot be expressed | **change** |
| AC10 | `covers` exists and passes with its two-member comparison; a case naming a filter list is a type error | **change** |
| AC11 | the shim produces `{ criteria: ["stale"] }`, not a filter | **change** |
| AC12 | the baseline records `selection` and `criteria` as two json fields | **change** |
| AC13 | passing — the four cases are the behaviour that must survive | **invariant** |
| AC14 | 187 files / 2462 checks, 0 type errors, 43 warnings, build green, 56 integration files | **invariant** |
| AC15 | two hits, both on `RunAsk` (`task-runner/types.ts:27-28`) | **change** |

## Risk notes

**High**, for the same two reasons as the pass before it, plus one of its own:

1. **The stored row changes shape again.** Nothing has shipped, so no row anywhere carries either
   shape — which is exactly why this is cheap now and a second breaking change later.
2. **The published port changes again.** `TaskHandlerInput` is what a third-party runner implements.
   Same answer: unshipped.
3. **`covers` is where a defect hid twice today** — first as a dropped ask, then as a merge that
   widened past both asks. It gets the red-first treatment and a mutation per check.

One thing to watch: the refusals move from "a selection was sent" to "a `leaves` filter was sent",
and a request may now carry several filters of the same kind. Two `leaves` filters intersect, which
is legal and means something; two `rule` filters with the same name are a duplicate and mean nothing
new.

## Human choices

Settled by the owner at the review of the previous pass, 2026-10-23:

- **One list, not two fields.** "selection — это тоже признак, как и stale… я бы это включил в более
  общий неймспейс."
- **A tagged data shape, not a class instance** — the column holds JSON; a class does not survive it.
- **Two kinds, not an enumeration of rule names** — a name in the type would put provenance's word in
  a type the plugin declares.
- **Now, before the commit** — the stored shape is about to ship in a major and a third-party runner
  replays it; changing it twice costs two breaking entries.

Raised by me at this gate:

- **`leaves` rather than `fields`** for the tag value, because `SourceFingerprint` already uses
  `kind: "fields"` in this codebase for a different thing.

## Open, not solved here

- Everything the previous contract left open stays open: the auto-translate rework, surfacing
  "translated nothing" to the host, the field-picker tree, a filter that widens rather than narrows.
- **The field-picker tree in the parallel session posts the old shape.** It must be told before it
  settles: `selection: ["title"]` becomes `filters: [{ kind: "leaves", addresses: ["title"] }]`.

## Review log

### 2026-10-23 — four reviews, three defects fixed

Risk is high, so three angles ran in parallel beside the comment audit.

| Angle | Verdict |
|---|---|
| behaviour preservation | the four cases hold; the intersection, the empty list and the order-independence are all as stated. One defect: the wrong reason reported when a run sends nothing |
| the stored row and the pre-1.0 shim | the round trip keeps each locale's filters, and the legacy branch is unchanged. One defect: `targets` entries were never parsed |
| the request refusals | the positional refusal cannot be walked around; the known rule names cannot drift. One defect: two removed members were stripped in silence |
| comments | 37 blocks judged. Four stated something false; two were stranded or broken; one contract was written four times over |

**Three defects, each fixed with a check that was red first.**

1. **`selection` and `criteria` were stripped, not refused.** `EnqueueInputSchema` is a plain
   `z.object`, which drops a key it does not declare — so a request asking for *less* was answered
   with a run over the whole document. That is the hazard the `strategy` refusal already exists for,
   and `strategy` had no check of its own either. All three are now refused by one `refused()`
   helper, under one check that names the three.
   *Not done: `.strict()` on the object.* It would refuse every unknown key and lose the message
   that names the replacement, and it would break hosts sending a field this schema never read.

2. **A stored `targets` entry was never parsed.** `runTargets` returned `input.targets` behind a
   cast, so `RunTargetSchema`'s `.default([])` never ran. An entry without `filters` reached
   `covers` as `undefined` and threw, and reached the worker as "no filters" — the whole document.
   `StoredInputSchema` now says `targets` holds unknown entries, which is what a `json` column
   makes true, and `runTargets` parses each one. **An entry that fails to parse is dropped, not
   defaulted to `[]`**: an unreadable entry says nothing about what its locale was meant to
   translate, and reading it as "no filters" would widen the run.

3. **`sentNothingBecause` blamed the wrong thing.** It decided from the named addresses and the
   final list, which cannot tell a rule that kept nothing from a leaf list naming addresses the
   document does not have. A rule-only run was reported as a success when leaves had in fact
   drifted and been skipped; a leaf-only run was told nothing was out of date when no rule had run.
   The reason now comes from `leavesToSend`, the only place that sees each step, as one of three
   named outcomes. Its docblock, which asserted the false premise, is gone with it.

**Comment audit — 37 blocks, 14 kept.** Four false statements corrected: the throw in
`leavesToSend` is also reached by a pre-1.0 row with provenance off; `everyTranslatableLeaf` does
not answer for an empty leaf; `runTargets`' shim prose contradicted `DEPRECATIONS.md`, which calls
`stale` the nearest meaning rather than the same one; `Provenance.criterion` still called the name
a criterion a row stores. `localesAsTheyStand`'s docblock had been stranded from its function by an
inserted helper, and `FieldChunkCollector`'s had lost the reason for its `structuredClone`. Two
names were doing the work a comment had been covering: `acceptedBy` → `impliedBySomeOf`,
`servedElsewhere` → `needsItsOwnRun` (it names the locales served *nowhere* yet).

**Declined, with reasons.**

- *Move `"stale"` into core so `store/` and `Provenance.criterion` share one constant.* Refused by
  the owner, 2026-10-24: `stale` is provenance's own word for what provenance measures, and core is
  not where that vocabulary belongs. The duplication is the price of keeping the term inside the
  module that owns it; the literal stays spelled in both places, tied by a test.
- *`storedTargets` groups by locale, so two tasks for one document and locale in a single
  `enqueue()` call keep only the later one's filters.* The route cannot produce it; pre-existing
  grouping, outside this pass.
- *A legacy `skip_existing` row fails on a host without provenance.* Deliberate, and already the
  third row of the table in `DEPRECATIONS.md#the-strategy-leaves-the-stored-run`.
- *The package is not `oxfmt`-clean.* Files nobody touched are flagged too, so formatting is not a
  gate here; only the one file this change left mis-indented was formatted.

### Checks

| | |
|---|---|
| `bunx vitest run` | 188 files / 2494 checks, green |
| `bun run check-types` (package and `apps/dev`) | 0 errors |
| `bunx oxlint .` | 43 warnings, 0 errors — the baseline |
| `bunx turbo run build` | green |
| `bun run test:integration` | 56 files / 225 checks green, 8 skipped |
| `sp-lint-delta` | nothing introduced |
| AC15 | the only hits are the pipeline's own `selection` parameter, which D3 keeps |
