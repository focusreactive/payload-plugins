# The carriers go

Build step: 2026-11-20-the-host-config-becomes-our-rules.design.md #4

## Requirements / Task restatement

One fact — whether a collection has a published layer — is answered in this package from two
places. The world derives it per request from the registered configuration. A set built once,
while the plugin's configuration is assembled, answers the same question for the enqueue
route. This step deletes the set and lets the route ask the world.

**This step changes behaviour, in one case, and ships saying so.** It is the only step of
this design that does.

Covers R1 and R4 of the design.

## What already exists — platform · installed · project · verdict

Nothing new is built. One derivation is deleted and its consumer is pointed at the one that
remains. The world, its adapter and the per-request lookup all landed in earlier steps of
this design and are used here unchanged.

## The defect this fixes, named rather than implied

The set is built while the plugin's configuration is assembled. A sibling plugin in this
repository rewrites the version configuration of host collections *after* that, returning a
new object — it is how a collection acquires a scheduled-publish layer. So a collection whose
drafts arrive that way is recorded in the set as having none, while the run path, which reads
the registered configuration, sees that it has.

What a user sees today: asking to translate named fields into a locale that holds nothing, on
such a collection, is refused. The refusal exists for collections with no published layer,
where a partial write would leave required fields empty. On a collection that does have one it
is wrong, and after this step it does not happen.

## Decisions

- **The route's configuration loses the set rather than refreshing it.** *Chosen:* delete it
  and ask the world per request. *Lost:* rebuilding the set later, or at first use — rejected
  because any copy taken before a request can be contradicted by a plugin that runs after it,
  which is exactly the mechanism that produced the defect. *Constraint:* the design fixes the
  registered configuration as the single source, read per call.
- **The publish gate takes a world rather than a boolean.** *Chosen:* the gate and the task
  builder are given the world. *Lost:* keeping the boolean — rejected because a boolean is
  what allowed a second derivation to exist at all: anything can produce one, from anywhere,
  and nothing marks where it came from. *Constraint:* a value that can be derived in two
  places will be.
- **The one-line wrapper around the gate is deleted, not renamed.** *Chosen:* its single
  caller calls the gate. *Lost:* keeping it for symmetry — it forwards its arguments unchanged
  and adds a name for a thing that already has one.
- **The hook is touched, but not because it was wrong.** It already reads the collection it
  was handed, per save, so its answer was never stale. It moves to the world for one reason
  only: so that one file is left deriving this fact, which is what the following step's
  analyzer zone requires. Recorded so a reader does not look for a defect here.

**Placement.** Everything stays in its module. The route's configuration type loses a field in
two declarations; the builder that filled it is deleted; the gate and task builder change one
parameter.

**New surface.** None.
**Written contract?** None beyond what earlier steps carry.
**Escalate?** No; the design covers this step.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R4 | A collection whose published layer arrives after the plugin read the configuration is treated as having one | a new case: configuration-time flat, registered layered, asking for named fields into an empty locale — run it red against the current code first, then green | red before the change with the refusal quoted, green after |
| AC2 | R1 | The configuration-time set is gone from the package | `grep -rn keepsDrafts src` | 0 hits |
| AC3 | R1 | One file is left deriving a version answer from the host | `grep -rln "hasDraftsEnabled\|hasAutosaveEnabled" src` | 1 file, the world's adapter |
| AC4 | R1 | The one-line wrapper is gone | `grep -rn resolvePublishOnTranslation src` | 0 hits |
| AC5 | — | The recorded probe still fails, because this step does not fix it | from `apps/dev`: `bun run test:integration:sqlite` | exactly 2 expected failures, not 0 |
| AC6 | — | No type errors | `bun run check-types` | 0 errors |
| AC7 | — | The analyzer does not regress | `bunx oxlint .` | 0 errors, warnings at or below 26 |
| AC8 | — | The unit suite stays green, and no case is added | `bunx vitest run` | 3049 passed, 15 skipped |
| AC9 | — | A real boot still answers as before | from `apps/dev`: `bun run test:integration:sqlite` | 278 passed, 7 skipped |

## Pre-flight

Run against the tree as this step starts, which is the tree the previous step left.

- **AC1** — the case does not exist yet, and the behaviour it pins is the one being changed.
  *change* — it must go red against the current code before anything is edited, and that red
  output is the evidence. This is the only acceptance criterion in this design's four steps so
  far whose subject is a behaviour rather than a shape.
- **AC2** — twelve files name the set today: four carry it in production, eight build it in
  tests. *change* — fails now, as it must.
- **AC3** — three files derive the answer today. *change* — fails now, as it must.
- **AC4** — one file today. *change* — fails now, as it must.
- **AC5** — 2 expected failures today. *invariant* — passes now, and a drop to 0 would mean
  this step silently fixed something it was not meant to touch, which is a finding.
- **AC6** — 0 errors. *invariant* — passes now.
- **AC7** — 26 warnings, 0 errors. *invariant* — passes now.
- **AC8** — 3049 passed, 15 skipped. *invariant after all.* The case written for AC1 went red
  against the unfixed code as required, and then turned out to duplicate a case that already
  existed: once the configuration-time answer is gone, "the layer arrived late" and "the
  collection keeps drafts" are the same setup, because the distinction the first name turned on
  no longer has a source. The two were merged under the existing name, which states the rule
  rather than the defect, and the count is unchanged. What pins the defect from returning is
  AC2: with no second source, the two answers cannot diverge.
- **AC9** — 278 passed, 7 skipped. *invariant* — passes now.

## Risk notes

- **Classified high**, and acted on as high: it changes behaviour, it touches a configuration
  type two modules declare, and eight test files construct the thing being deleted. A test is
  required rather than optional, the regression sweep is evidenced, and three review angles
  run rather than one.
- **The deletion is wider than the fix.** Only the enqueue route consumed the set, but the
  field is declared in two places and built in a third; all three go, or the type keeps a
  member nothing fills.
- **The hook's change is cosmetic and must not be described otherwise.** Its answer was never
  stale; it moves so that one file is left deriving the fact.
- A second session edits this tree; it is checked before each edit, and anything that appears
  and is not this work is reported rather than merged into it.

## Decisions by the owner

- 2026-11-20 — build the steps of this design in sequence without stopping at each one's
  gate, with the quality pass run against the working tree rather than the review marker.
