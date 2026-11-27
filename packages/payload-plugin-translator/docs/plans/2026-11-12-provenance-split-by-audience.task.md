# Task contract — splitting the provenance service by audience

**Risk: HIGH.** The class decides whether an editor's save survives a failure and what a receipt
claims. Six shipped files and fourteen test files name it, and every failure mode here is silent:
a receipt that claims too much, or a failure swallowed where it should have propagated, is
reported as success and surfaces later as text nobody asked to be re-translated.

## Requirements / Task restatement

`server/modules/provenance/Provenance.service.ts` is 272 lines and five public methods serving two
audiences that never meet. Split it into the half a translation run uses and the half the admin
panel uses, so that neither holds what only the other needs.

The caller table, verified against the code rather than assumed:

| Method | Caller | Audience |
| --- | --- | --- |
| `captureFingerprint` | `Provenance.criterion.ts`, `Provenance.module.ts` | a run |
| `record` | `Provenance.module.ts` | a run |
| `lastTranslatedFrom` | `Provenance.criterion.ts` | a run |
| `getStaleness` | `getDocumentStaleness.handler.ts` | the panel |
| `dismiss` | `dismissStaleness.handler.ts` | the panel |

- **R1 (in)** The run's half holds no document reader. `readSource` is reached only from the
  private `sourceAsItStands`, which only `getStaleness` and `dismiss` call, so today every run
  carries a Payload-bound document reader it never uses.
- **R2 (in)** Each consumer is handed only its own half: the drift criterion and the module's
  translation hooks get the recorder; the two staleness routes get the panel half.
- **R3 (in)** The rule deciding whether a failure is swallowed or propagated stays one thing
  across both halves.
- **R4 (in)** A behaviour the previous change introduced and nothing pins gets a test: for a
  collection the plugin does not translate, accepting a translation as it stands is a no-op and
  does not throw.
- **R5 (out)** Extracting the receipt-rebuilding policy out of the class so tests can reach it
  without a constructor. A separate body of work; it addresses the forty-two construction sites,
  not the five methods or the unused reader.
- **R6 (out)** That hashing the source answers `null` both for "this collection is not translated
  here" and for "the walk failed", so the drift criterion can report the wrong reason. Found
  during review of the previous change; it is a defect in its own right and is not made better or
  worse by this split.

## Why the split is safe only now

The class states its own reason for being one thing: a stored fingerprint is written and read in
one place, so the recorded claim and the hash it is later compared against cannot be computed two
different ways. That held while the hash was computed inside the class.

It is now computed by a single `fingerprintOf`, bound where the plugin resolves its content model
and handed to whoever needs it. The invariant rests on there being one function, not on there
being one class. The two halves already write differently on purpose — recording a receipt
preserves the `UNANSWERED` claim of a leaf no run answered, accepting a translation deliberately
re-bases it — and separating them makes that visible instead of leaving it as two branches in one
file.

## What already exists

- **Platform / installed libraries:** nothing to reuse. Splitting a class by its callers is not a
  library's job.
- **Project:** the swallow-or-propagate rule is already one named helper,
  `server/shared/payload/swallowOrThrow.ts`, decided and built on 2026-10-01 precisely because
  three inline copies of it had diverged. What is duplicated between the two halves is not that
  rule but the log fields wrapped around it.
- **Verdict:** nothing new is built except the one shared log wrapper in D3, and the two halves
  themselves.

## Decisions

**D1 — two concrete units, not one class behind two interfaces.**
Rejected: keep `ProvenanceService` as it is and hand each consumer a narrow interface it
implements. It is the smaller change and it does fix the type-level over-reach — a route could no
longer call `record`. It loses on R1, which is the reason the task exists: the object handed to a
run would still carry `readSource`. An interface narrows what a caller may ask for; it does not
narrow what the thing is built with.

**D2 — the halves are named `ProvenanceRecorder` and `DocumentStaleness`.**
Rejected: `RunProvenance` / `PanelProvenance`, which name the audience rather than the job and
would date badly the moment a third caller appears. The panel half is named for the question it
answers — whether a document-locale is out of date — and accepting a translation is the act of
answering "no longer", so both its methods sit under that name. Files follow the module's existing
role tags: `ProvenanceRecorder.service.ts`, `DocumentStaleness.service.ts`.

**D3 — one shared helper for the log fields around the swallow-or-propagate rule.**
Both halves wrap `swallowOrThrow` with the same four log fields. A small bound helper
`bestEffortIn(scope, logger)` is built once per half in its constructor.
Rejected: duplicate the six-line private method in each half. It avoids a new name, and with one
call site on the panel half it is nearly free today. It loses on the project's own history: the
rule it wraps is already a shared helper *because* three inline copies of it had silently diverged
and a reviewer, not a check, found that. Paying the same price twice is a choice, not an oversight.
Rejected: a flat free function taking scope, logger, the log fields, the message and the work —
five parameters, which the project's own reading measure treats as too wide.

**D4 — two factories, not one returning both halves.**
Rejected: a single factory answering `{ recorder, staleness }`. Every consumer but the module
itself uses exactly one half, so a combined answer would hand each of them a capability it does not
use — which is the defect this whole task removes, reintroduced one level up.

**D5 — the bound inputs are built per half.**
The existing `provenanceIo` builds a logger, a document reader and a fingerprinter together. It
splits into one builder per half, because the recorder's inputs are the logger and the
fingerprinter only.
Rejected: keep one builder and let each half take what its constructor declares. The extra reader
would be silently present on the object a run holds, which is R1 restated.
Note: `provenanceIo` is named by three test files through the module barrel, so this is a visible
rename rather than an internal one; it is not part of the published package surface.

**D6 — both halves keep the whole store port.**
Reading a receipt by key is used by both. Rejected: split `ProvenanceStore` into a writer port and
a reader port. The port is a published core contract with one Payload-backed implementation;
splitting it means either two adapters or one adapter claiming two interfaces, for no gain this
task needs. The consequence is recorded rather than hidden: neither half owns the receipt outright,
so the sole-ownership claim in the old class docblock cannot simply be moved.

Resolved during implementation, differently from how this decision first put it. The claim is not
rewritten as prose on either half; it became structural instead. `configureProvenance` takes one
`fingerprintOf` and hands that same one to both factories, so there is no second measurement for the
two halves to disagree about — the guarantee is a single parameter rather than a sentence a reader
has to be told to trust. A docblock restating it would explain the design instead of stating a
constraint the code cannot show, and this document is where that explanation belongs.

**Placement.** Both halves stay in `server/modules/provenance/`, replacing `Provenance.service.ts`.
The per-locale staleness type moves with the panel half; the receipt-merging rule moves with the
recorder. The shared log wrapper sits beside them in the same module, imported by path.

**New surface.** Two classes and two factory types replacing one of each, plus one shared helper
with two callers, both already in the codebase. Nothing reaches the published package surface:
neither the class nor its factory is exported from the package entry point.

**Shape check.** One trigger fired — the module's dependency object gains two fields that are
always set together, replacing one. Two shapes compared: five flat fields, or a nested pair under
one key. Flat was chosen: the next factory of this kind costs one field either way, the flat shape
admits no state the system does not produce, and the nesting would buy a name for a pair that has
no meaning beyond "the two halves". No field is optional, and nothing is implemented outside this
package.

**Written contract.** None new. The obligations each method owes — that recording preserves an
unanswered claim while accepting re-bases it, and that a failure inside a caller's transaction
propagates rather than being swallowed — exist today and are pinned by existing tests, which move
with the method they describe.

**Escalate to a design pass?** No. One module, no new pattern or seam, no dependency, no data-model
change, and the placement follows the module's existing layout.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
| --- | --- | --- | --- | --- |
| AC1 | R1 | The recorder names no document reader | `grep -c SourceDocumentReader src/server/modules/provenance/ProvenanceRecorder.service.ts` | no match |
| AC2 | R1 | A recorder built with no document reader records a receipt and reads one back | `bunx vitest run src/server/modules/provenance/__tests__/ProvenanceRecorder.service.test.ts` | exit 0 |
| AC3 | R2 | The staleness feature names only the panel half | `grep -rn "ProvenanceServiceFactory\|ProvenanceRecorder" src/server/features/staleness/` | no match |
| AC4 | R2 | The drift criterion and the translation hooks take the recorder | `bunx vitest run src/server/modules/provenance/__tests__/` | exit 0 |
| AC5 | R3 | Both halves swallow or propagate identically: a failure of ours is logged inside a caller's transaction, a Payload failure inside one escapes | the transaction cases in both halves' test files | exit 0, both cases run |
| AC6 | R4 | Accepting a translation on a collection the plugin does not translate is a no-op and does not throw | the new case in `__tests__/dismissalWritesTheReceipt.test.ts`, which already owns this behaviour | exit 0, green before the split and after |
| AC7 | — | The old service file is gone | `test -f src/server/modules/provenance/Provenance.service.ts` | exit 1 |
| AC8 | — | No new type errors | `bun run check-types` | exit 0 |
| AC9 | — | Analyzer findings do not rise | `bunx oxlint .` | at most 33 warnings, 0 errors |
| AC10 | — | The whole suite still passes | `bunx vitest run` | 2576 passed, 9 skipped, 0 failed — the 2572 of the untouched tree plus the two cases below, plus two more because two suites iterate over the source tree and it gains two files |
| AC11 | — | The sandbox still boots and translates against the built package | from `apps/dev`: `bun run test:integration:sqlite` | 248 passed, 7 skipped |

## Pre-flight

Run against the untouched tree at `5978a225`.

| AC | Command | Result | Classification |
| --- | --- | --- | --- |
| AC1 | the grep above | no such file | change — fails now, correctly |
| AC2 | the suite above | no such file | change — fails now, correctly |
| AC3 | the grep above | 2 hits in `features/staleness/model.ts` | change — fails now, correctly |
| AC4 | the suite above | passes against the single class | change — rewritten: it must name the recorder, which does not exist yet |
| AC5 | the transaction cases | pass against the single class | change — the cases exist; they must pass from two files after the split |
| AC6 | the new case | does not exist | invariant — the behaviour exists now, so the test is written first and must be green before the split |
| AC7 | `test -f` | file exists | change — fails now, correctly |
| AC8 | `bun run check-types` | exit 0 | invariant — passes now |
| AC9 | `bunx oxlint .` | 33 warnings, 0 errors | invariant — passes now |
| AC10 | `bunx vitest run` | 221 files, 2572 passed, 9 skipped | invariant — passes now |
| AC11 | the sandbox suite | 62 files, 248 passed, 7 skipped | invariant — passes now; run on this same tree before the split began |

## Risk notes

- **The failure mode is silence.** Nothing here throws when it goes wrong. A receipt written by the
  wrong half, or a failure swallowed where the previous code propagated, reports success and
  surfaces as re-translated text weeks later. The transaction cases in AC5 are the only mechanical
  guard, which is why they are a criterion rather than a side effect.
- **Forty-two construction sites across twelve test files**, twenty-six of them in the service's own
  test. Each moves to whichever half holds the method under test. A test left pointing at the wrong
  half still compiles if both halves happen to accept the same inputs, so the split of the test file
  is checked by reading, not only by a green run.
- **Accepting a translation is the one method that is not best-effort**, on purpose: a person
  pressed a button, so a store failure must reach them. It must not acquire the panel half's
  best-effort wrapper during the move.
- **Neither half owns the receipt alone** after D6. The docblock that claimed sole ownership is
  rewritten rather than copied into both files.

## Decisions by the owner

- 2026-11-12 — split by audience, rather than extracting the policy or leaving the class as it is:
  it is the only option that removes a dependency instead of moving code.
- 2026-11-12 — it lands in the current pull request, as its own commit on top of the walk swap,
  so the swap stays reviewable on its own.
- 2026-11-12 — the halves are named `ProvenanceRecorder` and `DocumentStaleness`, over naming them
  after their audience: an audience name dates the moment a third caller appears.
- 2026-11-12 — the log fields around the swallow-or-propagate rule become one shared helper rather
  than a copy in each half, on the evidence of the earlier divergence of that same rule.
