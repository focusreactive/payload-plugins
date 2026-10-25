# Dismissing the out-of-date mark writes the receipt

**Status:** awaiting approval · **Risk:** high · **Design:** `2026-10-24-dismissal-writes-the-receipt.md`
**Branch:** `feat/translator-fields-not-a-strategy`, alongside the uncommitted filters pass

## Requirements / Task restatement

A receipt holds two fingerprints of the source: `sourceFingerprint`, what the translation was made
from, and `dismissedFingerprint`, what the source looked like when an editor hid the out-of-date
mark. Three readers ask whether a locale is out of date and only one consults both, so hiding the
mark turns the lamp off and changes nothing else: the drifted-leaf list still names the field and a run
narrowing by `stale` still re-translates it over the text the editor chose to keep.

Hiding the mark will instead write `sourceFingerprint`, and `dismissedFingerprint` goes — from the
receipt, from the port, from the sidecar collection. One fingerprint, one meaning: *this translation
is considered current against this source*.

The design note states the defect in full, why the suite is green over it, and why the alternative
lost. **Its `## Not this task` section is spent** — every finding it defers was closed on 2026-10-24.

## What already exists — platform · installed · project · verdict

| Need | What already does it |
|---|---|
| write a receipt | `ProvenanceStore.upsert`, which takes exactly the shape a dismissal now produces |
| read the one the dismissal must preserve | `store.find`, which `dismiss` already calls, returning `sourceLocale` and `translatedAt` |
| decide what a leaf claims | `claimToRecord`, unchanged — a dismissal does not go through `record` |
| hash the source as it stands | `sourceAsItStands`, added this morning, already used by both `getStaleness` and `dismiss` |

Nothing new is built. The port loses a method and a field; no file is created.

## Decisions

**D1 — a dismissal is a targeted write: `ProvenanceStore.rebaseSourceFingerprint(key, fingerprint)`
replaces the deleted `dismiss`, and the port keeps five methods.**

*Taken at the Phase 2 gate and reversed in Phase 5, after review.* The gate chose `upsert`, reasoning
that a dismissal **is** writing a receipt and the method already existed. **That was wrong, and the
way it was wrong is the point:** `upsert` replaces the whole row from a snapshot taken before the
source was read and hashed. A translation finishing in that window is overwritten — its
`translatedAt` goes backwards, and every leaf it left `UNANSWERED` is re-based to the current hash,
so no later run picks those leaves up. The deleted `dismiss` was a single-column update and could
not do that. Reusing `upsert` therefore made concurrency *worse* than before the task, which no part
of the task asked for.

A targeted write restores what was there: one column, matched on the key, update-only — so a
dismissal also cannot resurrect a receipt whose document was deleted mid-call. The name says what it
does, which the old `dismiss` no longer would.

*Still rejected: a transaction around read-hash-write.* It would be stronger, but the race predates
this task and closing it is its own decision with its own cost; this task owes not making it worse.

**D2 — the receipt drops `dismissedFingerprint`, and `isRecordStale` loses its second branch.**
The owner's choice on 2026-10-24, over keeping both fields behind one shared reader. The reason is in
the design note: the bug exists because there are two fields and three readers, and the rejected
option leaves that trap set for the next reader.

**D3 — a leaf the receipt claimed unanswered is claimed current by a dismissal.**
Settled by the owner at this gate. A dismissal is an explicit statement by a person about this whole
document-locale, unlike the automatic re-base that `claimToRecord` refuses. *Rejected: leave such a
leaf unanswered.* `sameFields` compares the maps whole, so an unanswered claim never matches a hash —
the mark would stay lit after the button and the button would look broken, and nothing today can
report "never translated" apart from "out of date".
**Cost, recorded rather than discovered:** a leaf nobody translated is silently treated as done until
its source moves again.

**D4 — the sidecar field is removed now.**
Settled by the owner at this gate, over leaving it declared and unwritten — which is the same trap
this task exists to remove. Consumers' databases keep the column until their own migration drops it;
`docs/DEPRECATIONS.md` says so. `apps/dev` must have `dev.db` reset, or Payload's push will stop on
the column-drop prompt.

**D5 — `isRecordStale` stays a named function** although its body becomes one call.
It is the only export carrying "out of date unless the receipt describes the source as it stands",
and `describesCurrentSource` is private to `staleness.ts`. No abstraction is created; an existing one
shrinks.

### Placement

| Piece | Lands in | Why there |
|---|---|---|
| the receipt's shape and the port | `core/domain/provenance/ProvenanceStore.interface.ts` | where both already live |
| the staleness rule | `core/domain/provenance/staleness.ts` | `isRecordStale` is already the one place that decides |
| writing the receipt on a dismissal | `server/modules/provenance/Provenance.service.ts` | `dismiss` is already there and already reads the record |
| the stored row | `server/modules/provenance/Provenance.store.ts`, `Provenance.collection.ts` | all Payload coupling for provenance is in these two |

### New surface — the shape check

Triggers fired: a field is removed from a type; an exported method is removed from a port.

**Both are internal.** `package.json` publishes `.` and `./client/*` only; `src/index.ts` exports
`TranslationProvenanceRecord`, which never carried the fingerprints. `ProvenanceStore`,
`ProvenanceReceipt` and `ProvenanceKey` reach no consumer.

| | one fingerprint (chosen) | two fingerprints (today) |
|---|---|---|
| states the receipt admits | 3 | 9 |
| states where the readers can disagree | **0** — unrepresentable | 4 |
| cost of the next reader of "is this current" | 1 place | 2, and forgetting one is silent |
| breaks for an implementor outside this repo | nothing — the port is not published | — |

### Written contract

`dismiss` owes callers what it does to a leaf nobody translated, which no signature states. That is
D3, and Phase 3 writes it red-first.

### Escalate to `/sp-architect`?

No. One module, four files, and the design came from the owner.

## Acceptance Criteria

Run from `packages/payload-plugin-translator` unless stated.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | After a dismissal the locale reads as not stale **and** names no changed leaves | `bunx vitest run src/server/modules/provenance` | green |
| AC2 | After a dismissal the `stale` rule selects nothing for that locale | same | green |
| AC3 | After a dismissal, a further source edit makes both say out of date again | same | green |
| AC4 | A dismissal does not move `translatedAt` | same | green |
| AC5 | A leaf the receipt claimed unanswered is claimed current by a dismissal (D3) | same | green |
| AC6 | Nothing reads or writes a dismissed fingerprint | `grep -rn "dismissedFingerprint\|dismissed_fingerprint" src --include="*.ts"` | no hit |
| AC7 | The sidecar declares six fields, not seven | `bunx vitest run src/server/modules/provenance/__tests__/Provenance.collection.test.ts` | green, and the check names the absence |
| AC8 | A row written before this change still reads back without throwing | same suite as AC1 | green |
| AC9 | The dismiss route still answers, and the panel goes quiet end to end | `bun run test:integration` from `apps/dev`, after a rebuild | green |
| AC10 | Nothing else moves | `bunx vitest run` · `bun run check-types` · `bunx oxlint .` · `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root | ≥188 files / ≥2494 checks, 0 type errors, ≤43 warnings and 0 errors, build green |
| AC11 | The removed column is written down for consumers | read `docs/DEPRECATIONS.md` | an entry naming the column, what happens to marks already hidden, and what a host on schema push will be asked |
| AC12 | A dismissal writes the fingerprint and nothing else, and creates nothing | `bunx vitest run src/server/modules/provenance` | green |
| AC13 | A receipt predating per-leaf fingerprints is upgraded by a dismissal | same | green |
| AC14 | A source this caller cannot read writes nothing | same | green |

## Pre-flight — each check run against the current branch

| AC | Result now | Classification |
|---|---|---|
| AC1, AC2, AC5 | the cases do not exist; written against the untouched code each fails — a dismissal writes the other field | **change** |
| AC3, AC4 | **invariants, not changes.** Written against the untouched code both pass: a dismissal already left `translatedAt` alone, and the mark already returned when the source moved past the dismissal. Recorded here as guards on the fix, which is what they turned out to be | **invariant** |
| AC12–AC14 | added in Phase 5 with D1's reversal; the cases do not exist | **change** |
| AC6 | 37 hits across `src` | **change** |
| AC7 | `Provenance.collection.test.ts:41` asserts the field **is** declared; seven `name:` entries in the collection | **change** |
| AC8 | passing — the store already degrades an unreadable fingerprint to `null` | **invariant** |
| AC9 | passing — 56 files / 225 checks, 8 skipped | **invariant** |
| AC10 | passing — 188 files / 2494 checks, 0 type errors, 43 warnings, build green | **invariant** |
| AC11 | no entry exists | **change** |

## Risk notes

**High**, for three reasons.

1. **The stored row loses a column.** Consumers' databases keep it; nothing in the plugin reads it.
   Payload's schema push will offer to drop it, which in `apps/dev` is the prompt that hangs behind
   `concurrently` — `dev.db` must be reset rather than answered.
2. **A behaviour a person sees changes.** Before: hiding the mark quiets the panel only. After: it
   also keeps the field out of the next run. That is the point of the task, and it is the thing to
   state plainly in the release notes.
3. **D3 silences a leaf nobody translated.** Accepted deliberately; the alternative was a button that
   cannot turn the mark off. Worth a line in `DEPRECATIONS.md` beside the column.

One thing to watch: `provenance-access.int.test.ts:66` forges `dismissedFingerprint` through a cast
to `never`. That case goes with the field, and the cast goes with it — it must not be reproduced on
another column.

## Human choices

Settled by the owner, 2026-10-24:

- **Hiding the mark writes the receipt; the second fingerprint is deleted.** Chosen over one shared
  reader over two fields, because the trap is having two fields at all.
- **A leaf nobody translated is claimed current by a dismissal.** Chosen over excluding it, which
  would leave the mark permanently lit.
- **The column goes now**, not at the next major.
- **`dismiss` stays loud** — not best-effort, unlike its siblings. Settled earlier the same day and
  untouched here.

## Review log

### 2026-10-24 — four reviews; one of them reversed a decision this contract had already made

High risk, so three angles ran beside the comment audit.

| Angle | Verdict |
|---|---|
| the dismissal's behaviour | **two defects, one of them introduced by this task.** See D1 |
| the stored shape and the boot path | no defect in the code; **two defects in the deprecation entry**, and one hazard the plugin cannot prevent |
| the tests | no behaviour left unguarded, but **one tautology** and four untested cases |
| comments | 8 blocks: 3 deleted, 2 rewritten, 2 answered by a rename, 1 kept |

**Introduced by this task, caught in review, fixed.** Writing the receipt with `upsert` replaced the
whole row from a snapshot taken before the source was read, so a translation finishing in that window
was overwritten. D1 above records the reversal. A second, narrower case went with it: `upsert`
creates when no row exists, so a dismissal racing the delete-cascade could resurrect a receipt for a
deleted document. The targeted write cannot.

**The deprecation entry was wrong in a way the code was not.** It said no data the plugin needs is in
the column. Untrue for any host whose editors used the button: those rows hold the only record of
what was accepted, nothing reads it now, and every such mark comes back once. The entry now says so
and tells a host how to keep them. It also said a host on schema push "is offered the drop", leaving
out that the offer is an interactive data-loss prompt, that it fires whenever the table holds any
row even when the column is entirely null, and that it blocks where standard input is not a
terminal.

**One check proved nothing.** The route's dismissal case seeded a receipt whose fingerprint already
equalled the source's, so a dismissal that wrote the record back unchanged would have passed. It now
seeds a drifted receipt.

**Four cases nobody had written**, three of them now checked: a receipt predating per-leaf
fingerprints (AC13), a source this caller cannot read (AC14), and the adapter writing one column
only (AC12). The fourth — a leaf that disappears from the document and later returns — is left,
because it belongs to the open defect below rather than to this change.

### Open, found here, not this task

**`isRecordStale` and `driftedAddresses` still disagree when a leaf is removed from the source.**
(Named `leavesMovedSince` when this was written; that wrapper was removed on 2026-10-25 and its
`recordsEachLeaf` guard moved to the two call sites. The disagreement is unchanged.)
`sameFields` compares key counts, so a receipt naming `{a, b}` over a source holding `{a}` is stale;
`changedLeaves` walks the current leaves only, so it names nothing. The panel then says out of date
while the response names no field, and a run narrowing by `stale` translates nothing, so the mark
cannot clear except by a dismissal.

This predates the task — it is the same disagreement in a different pair of readers, and the task's
own criteria do not cover it. Closing it means deciding whether a leaf the source no longer has
counts as moved, which is a behaviour decision and the owner's. Recorded rather than fixed.

### Disagreed with a verdict, visibly

The comment audit asked for `apps/dev/scripts/verify-provenance.ts`'s four numbered section banners
to be replaced by a `step(name, work)` helper. Kept the banners: the script is a linear checklist a
person reads top to bottom, which is the one shape where a numbered heading earns its line, and the
rewrite widens a diff in a dev script for no behavioural gain. The dangling label the same verdict
found — `ok("other fields round-trip")`, whose "other" referred to a check this task deleted — is
fixed.

### Checks

| | |
|---|---|
| `bunx vitest run` | 189 files / 2500 checks, green |
| `bun run check-types` (package and `apps/dev`) | 0 errors |
| `bunx oxlint .` | 43 warnings, 0 errors — the baseline |
| `bunx turbo run build` | green |
| `bun run test:integration` | 56 files / 225 checks green, 8 skipped |
| `sp-lint-delta` | `mode=two-run`, nothing introduced |
| `sp-diff-checks` | two test-integrity rows remain, both accounted for below |

The hygiene gate's third row cleared when the adapter's three checks were added. The two that remain:
`provenance.int.test.ts` lost one assertion about a column that no longer exists, and
`chainOrder.test.ts` belongs to an earlier pass on this branch, where it guarded a field deleted
wholesale.
