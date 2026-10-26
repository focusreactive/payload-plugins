# The receipt holds a map

**Risk: HIGH.** Changes how a stored column is read, so a value already in someone's database
answers differently afterwards.

## Requirements / Task restatement

`SourceFingerprint` is a union of two shapes: `{ kind: "document"; hash }` — the single sha256 the
plugin wrote until 0.15.0 (2026-10-05) — and `{ kind: "fields"; hashes }`, the per-leaf map it has
written since. Nothing has produced the first shape for twenty days; it exists only so that a
receipt written by an older version still reads back.

Stop reading it. A stored value that does not parse as a per-leaf map becomes `null` — the same
answer as "there is no receipt". With one member left, the `kind` tag distinguishes nothing, so the
wrapper goes too and a receipt holds `RecordedFingerprints | null` directly.

The second walk falls out with it. `Provenance.service.sourceAsItStands` hashes the source document
twice on every staleness read — once per leaf, once whole — and the whole-document hash exists only
to compare against a legacy receipt. `2026-10-02-per-field-fingerprints.task.md` recorded that
double walk as a known cost it did not know how to remove without duplicating the hashing rule
(`### Not fixed, with the reason`). Removing the reader removes the need, so neither of the two
options it weighed is required.

**Out of scope, named rather than implied:** the disagreement between `isRecordStale` and
`driftedAddresses` when a leaf is *removed* from the document (recorded in
`2026-10-24-dismissal-writes-the-receipt.task.md`, `### Open, found here, not this task`). Both
sides of it are touched by this change and both must come out behaving exactly as they do now.

## What already exists — platform · installed · project · verdict

Nothing new is being built; this task only removes. No search up the ladder.

**Precedent, in this module, three days ago:** `2026-10-24-dismissal-writes-the-receipt.task.md`
removed `dismissedFingerprint` from the receipt type, the port and the sidecar collection, and
recorded the stored-data consequence in `docs/DEPRECATIONS.md`. Same module, same shape of removal,
same artifact. This task follows it.

## Decisions

### D1 — `RecordedFingerprints` is the surviving name; `SourceFingerprint` the type is deleted

**Chosen:** every site that held a `SourceFingerprint` holds `RecordedFingerprints | null`.

**Rejected:** keep `SourceFingerprint` as an alias of `RecordedFingerprints`. It loses because two
names for one concept is the thing this task exists to remove, and of the two it is the weaker
name: `RecordedFingerprints` says what the data is ("keyed by leaf address, holding every leaf the
run saw — sent or not", `SourceFingerprint.ts:18-21`), while `SourceFingerprint`'s own docblock
(`:26-30`) exists solely to explain that there are two member shapes. With one shape it explains
nothing.

**Constraint cited:** that docblock. A type whose documentation is a list of its members has no
meaning left once the list has one entry.

**The file and the two function names stay.** `SourceFingerprint.ts`, `parseSourceFingerprint` and
`serializeSourceFingerprint` are named after the **column** — `sourceFingerprint`, declared at
`Provenance.collection.ts:30` — not after the deleted type. They keep describing what they read and
write.

### D2 — `recordsEachLeaf` and `CurrentFingerprint` go; the check happens at the call site

**Chosen:** `recordsEachLeaf(x)` becomes `x !== null`, written where it is used (two sites:
`Provenance.criterion.ts`, `Provenance.service.ts`, plus `alreadyClaimed` in the same service).
`CurrentFingerprint` was `{ document, fields }`; with `document` gone it wraps one field, so
`isRecordStale` takes `FieldFingerprints` directly.

**Rejected:** keep `recordsEachLeaf` as a null-check helper. It loses because a named predicate over
one `!== null` is the same shape the owner removed from `leavesMovedSince` on 2026-10-25 — a wrapper
folding a guard into a computation, where the guard no longer narrows anything a reader cannot see.

**Constraint cited:** the owner's instruction on this branch, and the fact that `driftedAddresses`
already takes the map rather than the wrapper.

### D3 — an unreadable stored value is `null`, indistinguishable from no receipt

**Chosen:** `parseSourceFingerprint` returns `null` for an empty column *and* for text that does not
parse as a per-leaf map.

**Rejected:** a third state that keeps the two apart — an `unreadable` marker, so a caller could
tell "a receipt exists but we cannot read it" from "no receipt". It loses because no caller would
branch on it: **after this change** all three readers treat the two identically — stale, no
addresses reported, every leaf taken.

*Said precisely, because the loose version is wrong:* before this change they did **not** treat them
identically. A document digest matching the current source read as **current**, while an empty
column read as out of date. That difference is the behaviour this task removes, and it is what the
`DEPRECATIONS` entry describes. An earlier draft of the `parseSourceFingerprint` docblock claimed no
reader had ever acted on them differently; the comment audit caught it as false and it was
rewritten.

**Constraint cited:** the shape check's second question. A state the type admits and the system
never acts on is a gap between what is expressible and what is legal.

### D4 — the behaviour change is recorded in `docs/DEPRECATIONS.md`

**Chosen:** an entry under a new 2026-10-25 heading, naming what a host sees.

**Rejected:** treat it as internal and say nothing, on the grounds that no published type changes.
It loses because what changes is not a type but an **answer about stored data**: a host upgrading
with provenance rows from 0.10–0.14 sees locales flip to "out of date". `DEPRECATIONS.md` already
carries two entries of exactly this kind (`2026-10-05`, per-leaf receipts; `2026-10-24`, the
dismissed fingerprint).

### Shape check

Triggers walked. Three do not fire: no field is added to a published or externally implemented
type; no fields are added at all; no exported function gains a parameter; nothing becomes optional.

**One fires — "two functions answer parts of one question".** `isRecordStale` and
`driftedAddresses` both run over the same receipt and the same current hashes, and together answer
"is this locale out of date, and where". Ownership, stated: `isRecordStale` owns *whether*,
`driftedAddresses` owns *where*, and **neither owns a leaf the document no longer has** —
`sameFields` compares key counts so it calls that stale, `driftedAddresses` walks current leaves
only so it names nothing. That is the recorded open defect, and this task must leave it exactly
where it is. AC8 pins it.

Shapes considered for the receipt's fingerprint member:

| | `RecordedFingerprints \| null` (chosen) | tagged union of one member | a wrapper object `{ hashes }` |
|---|---|---|---|
| cost of the next member of this kind | add a member to the map; one place | add a union arm + a `switch` arm in 3 readers | same as chosen, plus unwrapping |
| states admitted / produced | 2 / 2 | 2 / 2, through a tag nothing reads | 2 / 2 |
| second caller already present | 3 readers, 2 writers | — | — |
| breaks for an implementor outside this repo | nothing; the type is not published | same | same |

The second is what we have, and its tag is read by `switch` statements with one reachable arm. The
third adds a level for no distinction. One shape survives.

**New surface:** none. **Written contract owed:** `parseSourceFingerprint` must say what `null`
means — no receipt and an unreadable one, deliberately the same. One sentence in its docblock, not
a `/sp-red-test` case: the unit exists, has tests, and this is a removal.

**Escalate to `/sp-architect`?** No. It stays inside one feature's own files
(`core/domain/provenance` + `server/modules/provenance`), adds no seam, needs no migration, and the
data question — whether old receipts may stop being read — was settled by the owner before this run
with the evidence in `## Human choices`.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | No fingerprint carries a `kind` tag anywhere | `grep -rn 'kind: "fields"\|kind: "document"\|kind === "document"' src/` | 0 |
| AC2 | `recordsEachLeaf` and `CurrentFingerprint` no longer exist | `grep -rn "recordsEachLeaf\|CurrentFingerprint" src/` | 0 |
| AC3 | The staleness read hashes the document once, not twice | `grep -c "computeSourceFingerprint" src/server/modules/provenance/Provenance.service.ts` | 0 |
| AC4 | `computeSourceFingerprint` still serves auto-translate | `grep -c "computeSourceFingerprint" src/core/domain/auto-translate/hasSourceContentChanged.ts` | ≥1 (invariant) |
| AC5 | A stored value that is not a per-leaf map parses to `null` | `bunx vitest run src/core/domain/provenance/SourceFingerprint.test.ts` | the case named "reads a value it cannot parse as no receipt" is green, and was red before the change |
| AC6 | The store reads such a row as a receipt with no fingerprint, without throwing | `bunx vitest run src/server/modules/provenance/__tests__/Provenance.store.test.ts` | `result.sourceFingerprint` is `null` for both a bare sha256 and arbitrary text |
| AC7 | A locale whose receipt cannot be read reports out of date, naming no leaves | `bunx vitest run src/server/modules/provenance/__tests__/Provenance.service.test.ts` | `isStale: true` and `changedLeaves` absent |
| AC8 | The removed-leaf disagreement is unchanged | `bunx vitest run src/core/domain/provenance/staleness.test.ts -t "is stale when a leaf was removed"` | green, with the same verdict as before |
| AC9 | The four legacy-receipt checks are **deleted**, not rewritten to a new answer | `grep -c "a receipt written before per-field fingerprints" src/core/domain/provenance/staleness.test.ts` | 0 |
| AC10 | Every non-legacy staleness verdict is unchanged | `bunx vitest run src/core/domain/provenance src/server/features/staleness` | green with no expectation edited — baseline is the suite as it stands at `HEAD` of this working tree |
| AC11 | The published surface is untouched | `bunx turbo run build --filter='./packages/payload-plugin-translator'` then `grep -c SourceFingerprint dist/index.d.ts` and `grep -c TranslationProvenanceRecord dist/index.d.ts` | 0 and ≥1 (both invariant) |
| AC12 | `docs/DEPRECATIONS.md` names what a host sees | read the new 2026-10-25 entry | it states the flip to "out of date" and how it clears |
| AC13 | No new type errors | `bun run check-types` in the package and in `apps/dev` | 0 each |
| AC14 | No new analyzer findings | `bunx oxlint .` | ≤43 warnings, 0 errors |
| AC16 | `README.md` no longer promises the three withdrawn refusals | `grep -c "it is refused alongside \`select_all\`" README.md` and a read of the replacement paragraph | 0, and the paragraph describes what the route does now |
| AC15 | The queue path still works end to end | rebuild, then `bun run test:integration` from `apps/dev` | 225 passed / 8 skipped, unchanged |

## Pre-flight — each check run against the untouched tree, 2026-10-25

| AC | Command | Result now | Kind |
|---|---|---|---|
| AC1 | the grep | **71** | change — fails now, correct |
| AC2 | the grep | **24** | change — fails now, correct |
| AC3 | the grep | **2** | change — fails now, correct |
| AC4 | the grep | 3 | invariant — passes now, correct |
| AC5 | the suite | `parseSourceFingerprint(LEGACY)` returns `{kind:"document"}` (`SourceFingerprint.test.ts:14`) | change — fails now, correct |
| AC6 | the suite | returns `{kind:"document", hash}` (`Provenance.store.test.ts:161,172`) | change — fails now, correct |
| AC7 | the suite | a legacy receipt matching the document hash reports `isStale: false` | change — fails now, correct |
| AC8 | the case | green | invariant — passes now, correct |
| AC9 | the grep | **1** | change — fails now, correct |
| AC11 | the greps | 0 and 1 | invariant — passes now, correct |
| AC13 | `check-types` | 0 and 0 | invariant |
| AC14 | `oxlint` | 43 warnings, 0 errors | invariant |
| AC15 | `test:integration` | 225 passed, 8 skipped | invariant |

Baseline for AC10: `bunx vitest run` over the whole package is 189 files / 2494 checks at the start
of this task.

## Risk notes

- **The one behaviour change.** A locale whose receipt predates 0.15.0 and whose source has not
  moved flips from "up to date" to "out of date". It clears on the next translation of that locale
  or on the editor hiding the mark, either of which writes a per-leaf receipt. The direction is a
  false alarm, never a false all-clear.
- **`toStoredData` already writes `null` into a `required: true` column** when a receipt's
  fingerprint is null (`Provenance.store.ts:55-58` against `Provenance.collection.ts:30`). It is
  unreachable today — `upsert` has one production caller and it always passes a map — and stays
  unreachable. This task does not widen it, but it moves the latent case one step closer, because
  `null` becomes reachable on the *read* side for a legacy row. Nothing reads a fingerprint and
  writes it back, so no path joins the two. Checked, not assumed.
- **`claims.pins.ts`** is a type-level pin file that is never imported and never run; `check-types`
  fails if one of its `@ts-expect-error` lines stops being an error. It names `RecordedClaim`, not
  the union, so it should survive untouched — but it is the kind of file a sweep misses.
- **`driftGuard.test.ts`** pins that the fingerprint side and the collector mint byte-identical
  addresses. This task must not disturb it; AC10's suite covers it.

## Human choices

**2026-10-25 — the owner authorised dropping the legacy read before this run started**, after asking
for it to be verified first. The verification he accepted:

- The published surface is not touched: `package.json` publishes only `.` → `src/index.ts`, which
  exports `TranslationProvenanceRecord` alone, and that type deliberately excludes the fingerprint
  (`ProvenanceStore.interface.ts:18-20`). `SourceFingerprint`, `ProvenanceReceipt`,
  `ProvenanceStore` and `parseSourceFingerprint` are exported from `src/core/index.ts`, which is not
  a package entry point. Confirmed against the built `dist/index.d.ts`: 0 occurrences.
- The `NOT NULL` column is safe: `store.upsert` has one production caller
  (`Provenance.service.ts:140`) and always passes a map.
- No crash path: every reader already handles `null`, which is the "no receipt" case.
- No wrong translation: on a legacy receipt `alreadyClaimed` already resolves to `{}`, and the
  `stale` rule already takes every leaf.
- `apps/cms` is unaffected: provenance is not enabled there and no migration carries the sidecar.

**Superseding an earlier decision, recorded so no reviewer re-raises it.**
`2026-10-02-per-field-fingerprints.task.md` D4 ("unknown is never stale") and its rejected
alternative ("treating a legacy record's document-level drift as *every leaf is stale*") rested on
the `skip_existing` strategy, which refreshed a leaf only on `sourceChanged === true`. That strategy
was deleted in `2026-10-23-fields-not-a-strategy.task.md`, and `Provenance.criterion.ts` already
takes every leaf when the receipt is not per-leaf. D4 was therefore already superseded before this
task; this task does not touch the criterion.

**2026-10-25, at the gate — the owner chose the full collapse** ("Да, как в договоре") over keeping
`SourceFingerprint` as an alias of the map, and over the smaller step of dropping only the
`document` branch while leaving a one-member union behind.

**2026-10-25, at the gate — the owner asked for `README.md:471` to be corrected in this same pass**
("Поправить в этом же проходе"). It still promises three refusals the enqueue route stopped making
earlier the same day: a `leaves` filter refused alongside `select_all` or a second id, a positional
address refused, and an unknown rule name refused. Unrelated to this task's subject, folded in
because it is a false statement in a published document. AC16 covers it.

**2026-10-25, after the review log — the owner asked for `vouchedFor` to be renamed** and for the
"vouch" vocabulary to be made one word across `src`. It was the only place in the mechanism using
that verb while everything around it said *answer* (`Criterion` "answers with", `answerTo`, the
local `answered` that is the argument passed in); the name hid that the parameter is a list **of
lists**; and it was wrong for half its callers, since `narrowSelection` is also called with the
addresses a person named, which nobody vouched for. `LeafAnswer` now names one answer,
`NarrowSelection`'s second parameter is `answers: readonly LeafAnswer[]`, and `Criterion` returns a
`LeafAnswer`. The plan files keep the old word: they record decisions as they were made.

## Open, not solved here

- `isRecordStale` and `driftedAddresses` still disagree when a leaf is removed from the document.
  Unchanged by this task on purpose; AC8 pins it.
- `toStoredData`'s `null` branch against a `required: true` column. Two reviewers raised it
  independently and both found it unreachable: `ProvenanceStore.upsert` has one production caller
  (`Provenance.service.ts:140`) and it always passes a map, and nothing reads a fingerprint and
  writes it back. What changed is the margin, not the reachability — `null` is now a value the read
  side produces, so a future caller that round-trips a receipt through `upsert` would write it. The
  honest fix is to give `upsert` a write shape whose fingerprint is not nullable, which means a
  second receipt type for one caller; that is the "no new abstraction without two callers" brake, so
  it waits for the second caller rather than being built here.

## Review log

### 2026-10-25 — comment audit (fresh eyes, 4 blocks, 4 verdicts)

Density 0.31 comment lines per 10 code lines — ok. **One finding was a real error of fact and is
the reason this pass earned its place:** the `parseSourceFingerprint` docblock claimed "no reader
has ever acted on them differently" about an empty column and a legacy digest. False about the past
— until this change a digest matching the current source read as *current* while an empty column
read as out of date, which is precisely the behaviour this task removes. Rewritten to state the
contract without the claim. Two more blocks deleted (one repeated the docblock and the same false
claim; one described a test helper as "what the source hashes to now" when it also builds stored
claims). One rewritten: the `changedLeaves` docblock said "when no receipt could be read", but
`getStaleness` only produces an entry for a receipt it *did* read — what is absent is its
fingerprint.

### 2026-10-25 — three review angles (high risk)

**Unintended behaviour change: none found.** Each site was traced against `HEAD` and shown
equivalent for every non-null input — `isRecordStale`, `getStaleness`'s `changedLeaves` emission,
`driftedLeaves`' guard, `record`'s `alreadyClaimed`, `dismiss`'s written value, and the serializer's
output for a map.

**Test integrity: no coverage lost.** Every deleted check had a subject that no longer exists, and
every legacy input survives — pushed through `parseSourceFingerprint` instead of constructed. Two
assertions came out *stronger* (`toBeNull()` where `?.kind` was compared; the store's upsert check
now writes a value that differs from the record's). Two weak spots were raised and both fixed here:
`theWatermark.test.ts` asserted only `not.toBeNull()` where `{}` would have passed, now
`toEqual({title, body: UNANSWERED})`; and `translate-document/__tests__/handler.test.ts` still cast
to `{ kind: string; hashes: ... }`, a shape that no longer exists, hidden from the checker by the
`as` — now `RecordedFingerprints`.

**Stored data: no throw, no loss, no false all-clear.** Every column value a real database could
hold was walked end to end. Two inaccuracies in `DEPRECATIONS.md` were found and fixed:

1. "clears the first time that locale is translated" overstated it. A legacy row carries no earlier
   claims, so a **narrowed** run records every unsent leaf as unanswered and the mark stays. The
   entry now says *translated in full*, and names what a narrowed run does.
2. The 2026-10-24 entry tells a host to copy `dismissedFingerprint` into `sourceFingerprint` to keep
   hidden marks. For a mark hidden before 0.15.0 that value is a bare sha256, so copying it now
   writes something that reads as no receipt and the mark returns anyway. The new entry says to copy
   only JSON maps, and that those locales need the button pressed again.

The claim that the error direction is always safe survived an attempt to falsify it: there is no
path from a legacy, corrupt or unanswered value to "current".
