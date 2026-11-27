# One answer about the layers

Build step: 2026-11-20-the-host-config-becomes-our-rules.design.md #3

## Requirements / Task restatement

The write layer works out for itself whether a collection has a published layer, by reading
the host's version switches directly. The world does the same thing, for the read side. Two
answers to one question now exist in the package, derived independently.

This step gives the write layer the world instead, so the question has one answer. **No
behaviour changes:** the layer the caller receives is identical for every shape a host's
version config can take.

Covers R1 and R3 of the design.

## What already exists — platform · installed · project · verdict

Both answers already agree, and that was confirmed before anything was changed rather than
assumed afterwards. The write layer's own contract suite and the world's suite enumerate the
same nine shapes of the host's version config — absent, `false`, `true`, an empty object, an
object with only a retention count, drafts off, drafts on, drafts as an object, and autosave
in each of its forms — and the two reach the same verdict on every one of them, including
the delicate one: a versions config switched on without a draft layer has no published layer.
They agree because both delegate to the same host predicates; the point of this step is that
only one of them should be delegating. Nothing new is built.

## Decisions

- **The layer takes a world and ignores its reads.** *Chosen:* the signature accepts a world
  of any read type and uses only its kind and its autosave value. *Lost:* taking the kind and
  the autosave flag as two parameters — rejected because two positional values of related
  meaning are exactly the shape a caller can swap silently, which the package already guards
  against elsewhere. *Constraint:* a signature demands only what the answer depends on, and
  the read arguments are not part of this answer.
- **The layer union stays where it is and keeps its names.** *Chosen:* the write layer, the
  publish scope and their union remain in the write-side module. *Lost:* folding them into
  the world — rejected because the world states which layers exist and the write layer states
  how to write into one, and collapsing them would give one type two subjects.
- **The contract suite is re-pointed, not rewritten.** *Chosen:* its cases become worlds
  rather than host configs. *Lost:* keeping them as host configs by having the test build a
  world from each — that would reintroduce exactly the second derivation this step removes.
  *Consequence, stated rather than hidden:* the end-to-end fact "a versions config switched on
  without drafts yields a layer that cannot publish" is then pinned by two suites in
  composition — the world's suite maps the config to the kind, this one maps the kind to the
  layer — instead of by one. Each suite gains a single subject; the composition is no longer
  asserted in one place.

**Placement.** Everything stays in its current module. One import leaves the write-side
module; one call site changes.

**New surface.** None.
**Written contract?** None beyond what the earlier steps carry.
**Escalate?** No; the design covers this step.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | The write layer no longer reads the host's version switches | `grep -c "payload/shared" src/server/features/translate-document/targetLayer.ts` | 0 |
| AC2 | R1 | The files deriving a version answer from the host drop from four to three | `grep -rln "hasDraftsEnabled\|hasAutosaveEnabled" src` | 3 files, and the write-side module is not among them |
| AC3 | R3 | A layer with no published layer still cannot be asked to publish | plant a publish access on the flat variant, run `bun run check-types`, revert, quote both outputs | red with the plant, green without |
| AC4 | — | The layer is unchanged for every shape of the host's config | `bunx vitest run src/server/features/translate-document` | exit 0, every case of the contract suite runs |
| AC5 | — | The host-config slice type the layer exported is gone | `grep -rw VersionsSlice src` | 0 hits |
| AC6 | — | No type errors | `bun run check-types` | 0 errors |
| AC7 | — | The analyzer does not regress | `bunx oxlint .` | 0 errors, warnings at or below 26 |
| AC8 | — | The unit suite stays green, less the cases the contract suite sheds | `bunx vitest run` | 3049 passed, 15 skipped — twelve fewer, and only those |
| AC9 | — | A real boot still answers as before | from `apps/dev`: `bun run test:integration:sqlite` | 278 passed, 2 expected failures, 7 skipped |

## Pre-flight

Run against the tree as this step starts, which is the tree the previous step left.

- **AC1** — one import today. *change* — fails now, as it must.
- **AC2** — four files today: the write layer, the world's adapter, the auto-translate hook
  and the module wiring. *change* — fails now. Two of the four leave in the following step,
  not this one; this step accounts for one.
- **AC3** — not runnable as written until the signature changes; the property it pins holds
  today and must still hold after. *change* in form, *invariant* in substance — the plant is
  the proof and is run in the build phase.
- **AC4** — the contract suite passes today. *invariant* — it is the behaviour baseline.
- **AC5** — present in two files today. *change* — fails now, as it must.
- **AC6** — 0 errors. *invariant* — passes now.
- **AC7** — 26 warnings, 0 errors. *invariant* — passes now.
- **AC8** — 3061 passed, 15 skipped. *invariant on every case but the contract suite's.* The
  decision above sheds twelve of that suite's cases: nine shapes of the host's config collapse
  to three worlds, in two tables, so 19 cases become 7. The expected count is therefore 3049,
  and anything other than exactly twelve fewer is a finding.
- **AC9** — 278 passed, 2 expected failures, 7 skipped. *invariant* — passes now. The two
  expected failures are the recorded probe for a defect this work does not yet fix.

## Risk notes

- **Classified low**, and acted on as low: a signature change the type-checker verifies, with a
  contract suite that already enumerates every shape of the input, and the two derivations
  confirmed identical before the change. One review angle rather than three.
- The one thing this step gives up is named above under decisions: a composition that was
  asserted in one suite is now asserted across two. If a future change breaks the mapping
  between them, neither suite fails on its own.
- A second session edits this tree; it is checked before each edit, and anything that appears
  and is not this work is reported rather than merged into it.

## Decisions by the owner

- 2026-11-20 — build the steps of this design in sequence without stopping at each one's
  gate, with the quality pass run against the working tree rather than the review marker.
