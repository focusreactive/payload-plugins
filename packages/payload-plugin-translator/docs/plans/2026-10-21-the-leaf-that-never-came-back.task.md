# The leaf that never came back

Design: `~/.claude/plans/goofy-fluttering-phoenix.md` (approved by the owner, 2026-10-21)
Builds on: [a run reports the leaves that came back](./2026-10-21-report-what-came-back.task.md)

## Requirements / Task restatement

The previous step stopped a run claiming leaves the model never answered. Review showed the cure
is half of one. When such a leaf has **no earlier claim** — a first run, a legacy document-shaped
receipt, an address that appeared since — `ProvenanceService.record` writes `DECLINED`, and
`DECLINED` is inert by design:

```ts
// staleness.ts:15 — the load-bearing line
const claimedHash = (recorded: string | null | undefined): string | undefined =>
  typeof recorded === "string" ? recorded : undefined;
```

`matchesClaim` then returns `true` (the leaf never makes a record stale) and `leafSourceChanged`
returns `undefined` (`changedLeaves` omits the address). `SkipExistingStrategy` ends in
`ctx.sourceChanged === true`, which `undefined` fails, and the target is no longer empty because
the reconciler copied the source text into it before the model was called. The leaf is never
revisited, and a later edit to the source does not rescue it.

Reverting that copy is not an option, and the reason is the owner's: the document is copied
one-to-one deliberately. A required field left empty fails validation and blocks the save of the
**whole** translation — money spent, every other field lost — and a reader is better served by text
in another language than by nothing.

So the leaf gets its own recorded state. The column is plain text holding JSON, so the database
enforces nothing; the validation schema and the types are the only enforcement points, and this
step puts the state in both.

## What already exists — platform · installed · project · verdict

| Needed | Found | Verdict |
|---|---|---|
| a branded string idiom | `IdPath`, `RenderedSegment` — `string & { readonly __brand: "X" }`, minted in one constructor (`idPath.ts:22,46,66-80`) | reuse exactly |
| schema validation in `core` | zod, already used twice under `src/core` with the same `TODO(core-deps)` note | reuse; no precedent set |
| the per-leaf tally | `leavesFullyWritten` already counts sent/written per address (`TranslationPipeline.ts:21-35`) | reuse — the outcome list is the same pass |
| "which leaves were attempted" | nothing carries it; `currentFields` already excludes leaves with no extractable text | derive from the tally's keys |

Nothing new from outside the package. No new dependency.

## Decisions

All four are inherited from the approved design and all four are **due here** — the plan is this
task, not a superset of it. Recorded with their rejected alternatives so no reviewer re-argues them.

**D1 — a third recorded state, not an omitted address.** *Lost:* leaving the address out of the
stored map. *Constraint:* `sameAddresses` (`staleness.ts:18-20`) compares key sets, so an omitted
address reports the **whole document** out of date rather than the one leaf — and
`leafSourceChanged` still returns `undefined` for a missing key (`:67-68`), so the leaf is still not
re-selected. The remedy would be louder and still not work.

**D2 — the pipeline reports one list of outcomes**, replacing `translatedPaths`. *Lost:* a second
array `attemptedPaths` beside the first. *Constraint:* two arrays admit a state the system never
produces — a leaf translated but not attempted — and nothing enforces the containment; one list
makes that state unrepresentable. Chosen by the owner at the gate.

**D3 — the hash becomes a branded type, and all three readers name all three states.** *Lost:*
adding the literal and leaving `staleness.ts` alone. *Constraint:* that version works, but only
because `claimedHash` accepts any string as a hash — while the docblock one line above promises the
opposite ("a stored value neither reader understands must claim nothing, never drift"). The
behaviour rests on a coincidence the next person removes while making the code match its own
comment. Branding makes the union honest and the compiler then requires every reader to decide.
Chosen by the owner after the plan was written.

**D4 — the strict schema is scoped to the `fields` arm's values.** *Lost:* validating the column.
*Constraint:* the legacy 64-hex document digest from 0.8.0–0.14.0 lives in the `document` arm, and
`parseSourceFingerprint`'s stated contract is that a corrupt value there "is deliberately not an
error, it simply never matches" (`SourceFingerprint.ts:34-38`). Map values have only ever been
16-hex or `null` — one commit, never changed — so the strict check is safe for every record a
release wrote.

### Placement

Everything lands in files that already own the concern: the union, the brand and the schema in
`core/domain/provenance/SourceFingerprint.ts`; the three readers in
`core/domain/provenance/staleness.ts`; the minting in
`core/domain/content-projection/computeFieldFingerprints.ts`; the outcome list in
`core/translation-pipeline/{TranslationPipeline.ts,types/Pipeline.ts}`; the three-way write in
`server/modules/provenance/Provenance.service.ts`. No new file except a test fixture helper.

### New surface — the shape check fired

Triggers: a field is added to a type (`PipelineResult`), and a function gains a parameter
(`record`). Two shapes were compared and the owner chose:

| | A: one list of outcomes | B: `translatedPaths` + `attemptedPaths` |
|---|---|---|
| cost of the next outcome kind | one — widen `LeafOutcome` | one per array, and every caller must keep them aligned |
| states admitted / produced | 2 / 2 → gap **0** | 4 / 3 → gap **1** (translated-but-not-attempted) |
| second caller in the codebase | the handler, then `record` | same |
| breaks for an implementor outside this repo | nothing — `PipelineResult` is not exported | same |

New names: `SourceHash`, `UNANSWERED`, `RecordedClaim`, `LeafOutcome`. Each has at least two
callers already in the tree (the minting site and the readers; the pipeline and the handler).

### Written contract

Two units owe callers what a signature cannot say:

- **`UNANSWERED` must read as *drifted*, not inert.** The union cannot express that; the three
  readers must, and AC5 pins it.
- **`parseSourceFingerprint` re-admits the brand.** It is the one cast in this change, it happens
  after validation, and it is the first branded value in this package read back from storage.

### Escalate to `/sp-architect`?

No — Phase 0 carries an approved design for exactly this change.

## Acceptance Criteria

From `packages/payload-plugin-translator`.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | A leaf sent and unanswered **with no previous receipt** is stored as `UNANSWERED`, not `null` | `bunx vitest run src/core/translation-pipeline/__tests__/theLeafThatNeverCameBack.test.ts -t "no previous receipt"` | the stored hashes map holds the literal for that address |
| AC2 | That leaf is selected again on a second run under `skip_existing` | same file, `-t "selects it again"` | `changedLeaves` marks the address changed, and `SkipExistingStrategy.shouldTranslate` returns `true` for it with a non-empty target. **Already true before the change, by the coincidence D3 removes — so this is an invariant to preserve through the branding, not a change** |
| AC3 | A leaf sent and unanswered **overwrites** a previous hash claim | same file, `-t "overwrites an earlier claim"` | the stored value becomes the marker. **Corrected during execution** — see below |
| AC4 | A leaf the run never attempted keeps its previous claim | same file, `-t "never attempted"` | unchanged from today |
| AC5 | Staleness reports a record holding `UNANSWERED` as out of date | `bunx vitest run src/core/domain/provenance/staleness.test.ts -t "unanswered"` | `isRecordStale` is `true`; `leafSourceChanged` is `true` |
| AC6 | **Unhappy** — a stored map with an unrecognised value no longer parses as per-leaf | `bunx vitest run src/core/domain/provenance/SourceFingerprint.test.ts -t "unrecognised"` | reads as `{ kind: "document" }` |
| AC7 | A legacy 64-hex document digest still parses as `document` | same file, `-t "legacy"` | unchanged |
| AC8 | A value that is not 16 hex characters is refused by the schema | same file, `-t "sixteen"` | a short or over-long value reads as `document` |
| AC9 | All three states survive a serialize/parse round trip | same file, `-t "round trip"` | hash, literal and `null` come back as written |
| AC10 | The pipeline reports an outcome per attempted leaf | `bunx vitest run src/core/translation-pipeline/__tests__/reportsWhatCameBack.test.ts` | a partly answered leaf is `answered: false`; a leaf with no chunk is absent |
| AC11 | Nothing else moves | `bunx vitest run` | 178 files / 2382 checks plus the new ones |
| AC12 | Clean types and lint | `bun run check-types`, `bunx oxlint .` | 0 type errors; 0 lint errors, ≤44 warnings |

## Pre-flight

Against the untouched tree, 2026-10-21, branch `fix/translator-report-returned-not-attempted`
carrying the uncommitted #197 work.

| AC | Command | Result | Classification |
|---|---|---|---|
| AC1 | `theLeafThatNeverCameBack.test.ts -t "no previous receipt"` | fails — `record` writes `null` | **change** — fails now, and is the whole defect |
| AC2 | same file, `-t "selects it again"` | **passes already** | **invariant** — see below |
| AC3, AC4 | same file | pass already | **invariant** |
| AC5 | `staleness.test.ts -t "unanswered"` | no such case | **change** — fails now |
| AC6, AC8 | `SourceFingerprint.test.ts` | `'{"title":42}'` already reads as document (pinned), but a *string* value is accepted whatever its shape | **change** — the string half fails now |
| AC7 | `SourceFingerprint.test.ts -t "legacy"` | passing | **invariant** |
| AC9 | round trip over three states | the third state does not exist | **change** — fails now |
| AC10 | `reportsWhatCameBack.test.ts` | 10 checks passing against `translatedPaths` | **change** — the field is being replaced |
| AC11 | `bunx vitest run` | 178 files, 2382 checks, passing | **invariant** |
| AC12 | `bun run check-types` · `bunx oxlint .` | 0 errors · 44 warnings, 0 errors | **invariant** |

### Two corrections made while building

**AC3 was written backwards.** It said a leaf sent and unanswered keeps an earlier hash claim. It
must not: the collector seats a detached copy of the **source** text into the target of every leaf
it selects (`FieldChunkCollector.ts:156-158`), so after such a run the target no longer holds the
earlier translation — it holds source text. Keeping the old hash would claim a translation that is
no longer there. The marker overwrites it. The case that genuinely keeps a previous claim is a leaf
the run **never sent**, and it now has its own check.

**The guard for this change is the compiler, and a test run cannot see it.** The mutation that
removes `claimOf`'s marker branch leaves all 2393 checks green, because the bundler strips types
before anything executes — and treating the marker as a hash happens to produce the same answers,
which is the very coincidence D3 exists to remove. Run through `check-types` the same mutation is an
error in two places: `'"!unanswered" | SourceHash' is not assignable to 'SourceHash'`, and
`Property 'hash' does not exist on type '… | { kind: "unanswered" }'`. So the guarantee is pinned
where it lives — `__tests__/claims.pins.ts`, two `@ts-expect-error` directives that stop being
errors the moment the brand is removed.

### What the red run showed, and how it narrowed the task

Only **one** of the five new checks went red. The leaf's whole downstream journey — `changedLeaves`
marking it drifted, `SkipExistingStrategy` selecting it, `previousClaim` carrying a sentinel
forward — already behaves correctly, because `claimedHash` accepts any string as a hash. So the
defect is exactly one line's worth: `record` writes `DECLINED` where it should write a marker.

That makes D3 the larger half of this change and sharpens why it was chosen. The behaviour this
task needs is already there **by coincidence**, and the coincidence is one `typeof === "string"`
away from being removed by someone tidying `claimedHash` to match its own docblock. Branding
converts the coincidence into a rule the compiler keeps — which is why AC2 is written as an
invariant through the branding rather than as a change.

## Risk notes

**High risk** — the change alters what is written into stored provenance and the staleness verdict a
user reads. Phase 4's sweep is evidenced; Phase 5b runs three review angles.

- **The brand turns every hand-written fingerprint fixture into a compile error** — roughly twenty
  sites across six test files. Two of them hold short fake hashes (`"3a7f1c"`, `"2222"`) that the
  strict schema will also refuse wherever the fixture round-trips through the store. A single
  `asHash` helper absorbs the mechanical part; the short values must become 16 hex characters.
- **The strict schema widens an existing degradation path.** An unrecognised value already drops a
  whole record to the legacy document digest; this extends that to unrecognised *strings*. Deliberate
  — it is the enforcement the database cannot give — but it means a record written by a future
  version carrying a fourth state would read, on this version, as "everything out of date".
- **`previousClaim`'s `?? DECLINED`** carries a string sentinel forward untouched, so a leaf
  unanswered twice stays unanswered. Verified by reading; pinned by AC3's sibling case.

## Human choices

- **2026-10-21** — variant A (a third state) over reverting the reconciler's copy, with the reason
  stated by the owner: a required field left empty blocks the save of the whole translation, and a
  reader is better served by text in another language than by nothing.
- **2026-10-21** — one list of outcomes rather than two parallel arrays.
- **2026-10-21** — branding the hash is mandatory: *"Лучше уже вариант A, но его придется закрепить
  на уровне схемы валидации и типов, раз мы не можем закрепить этот вариант на уровне БД."*

## Open, not solved here — carried to step 4 (#198)

- A run that answered nothing still writes a receipt with a fresh `translatedAt`, so the admin reads
  "translated just now" over a run that translated nothing.
- The field-level endpoint (`translate-field/handler.ts`) writes no receipt at all, so a leaf
  translated through it leaves provenance untouched.

## Review log

### Phase 5b — three angles on the final code

**The recorded state, over every reachable combination.** No defects. The full matrix of
{never sent · sent and answered · sent and unanswered} × {no receipt · legacy document digest ·
a hash · `UNANSWERED` · no entry for the address} was walked cell by cell; every cell stores what
the decisions ask for. Four things it confirmed rather than found:

- `dismiss` writes `dismissedFingerprint`, which no reader of per-leaf claims consults, so an
  editor hiding the indicator does not undo the marker — the next run still re-selects the leaf.
- `sameAddresses` compares keys, and the stored map's keys are exactly `currentFields`'s. The
  marker changes a value, never a key, so the rejected "omit the address" alternative is not what
  the code does by another route.
- A leaf answered on a later run clears the marker, because `claimFor` returns the new hash.
- Under `overwrite` the marker costs nothing, since that strategy ignores `sourceChanged`. Under
  `skip_existing` a leaf the provider deterministically never answers is now re-sent every run —
  repeated spend in place of silent permanence, which is the trade the owner chose.

**The stored shape, its validation and the brand.** Two findings applied, one declined.

- *Applied — the second pin was a duplicate.* `_markerAsHash` and `_bareString` asserted one fact
  (a plain string is not a `SourceHash`). It now pins the guarantee that is actually at stake: a
  `RecordedClaim` cannot be used where a hash is required until the marker and the decline are
  ruled out. Each pin now fails on its own mutation — removing the brand reddens the first,
  collapsing `RecordedClaim` to `SourceHash` reddens the second.
- *Applied — the `SourceHash` docblock over-claimed again.* It said the marker "has to be ruled out
  before a claim can be used as a hash", which reads as covering comparison. The brand gates
  assignment only; comparison is kept honest by the `Claim` union in `staleness.ts`. Reworded to
  say exactly that.
- *Applied — the `asHash` fixture admitted colliding seeds.* It dropped non-hex characters and
  padded, so `"x"`, `"y"` and `""` all produced the same hash, and its docblock said so instead of
  the code preventing it. It now refuses a seed that is not 1–16 hex characters. Eight word seeds
  in `Provenance.service.test.ts` became hex (`new`→`feed`, `old`→`dad`, `old-body`→`dadbed`,
  `moved`→`deed`, `untouched`→`cafe`, `stale`→`fade`, `fp`→`face`, `x`→`ace`); no check changed
  meaning, and no collision existed in the suite before the change.
- *Declined — "a stored value outside the accepted set demotes the whole record".* True, and D4
  settles it: the demotion is the pre-existing behaviour for a non-string value, extended to an
  unrecognised string. The provenance collection is hidden with every access denied, so only a
  direct database write could produce such a value.

Backward compatibility was re-checked independently of the research and agrees with it: one commit
over `computeFieldFingerprints.ts`, `HASH_LENGTH = 16` from the first version, one writer, and the
64-hex legacy digest only ever in the `document` arm. The installed zod is 3.25.76 — the schema
depends on that major, since `z.record` with one argument throws in 4.x — and a failed regex stops
the transform, so the inferred output is exactly `RecordedClaim`.

**After the three angles:** 179 files / 2397 checks · `check-types` 0 · `oxlint` 44 warnings,
0 errors. Every acceptance criterion walked with its own declared command.

### Four audits over the finished change

**Complexity.** One proposal, not applied: the three-state rule is written twice in
`staleness.ts`, in `matchesClaim` and `leafSourceChanged`, and the two are exact negations with
nothing holding them together. A fourth state must be branched into both; a mistake in one gives an
`isRecordStale` and a `changedLeaves` that disagree, with the compiler silent. Counters for the
fix — one per-value `leafChanged` with `matchesClaim` derived from it: CHANGE 9 → 8, READ 6 → 6,
STATE unchanged. Recorded for whoever adds the fourth state.

Also measured and accepted: a fourth state costs 9 edit sites across 4 files, **8 of them forced by
the compiler**. That is what the brand and the tagged union were bought for.

**Abstraction.** Two findings, both applied.

- The module mock in `handler.test.ts` restated `HASH_LENGTH: 16` and the pattern, because
  `SourceFingerprint.ts` began importing `SOURCE_HASH_PATTERN` and `vi.mock` replaces a whole
  module. A new export had created a correctness obligation in a test about a different subject.
- `asHash` fakes a `SourceHash`, which `content-projection` owns, but lived in `provenance`'s
  private test folder and was reached by deep path from four other modules.

Measured and declined: `PipelineContext` admits 64 combinations and the pipeline produces 7, which
is what forces the `?? []` fallbacks at `TranslationPipeline.ts:104`. The fix is a typed stage
chain, which step S rewrites anyway — the number is recorded so the swap inherits it.

**Red-test, in audit mode.** Stubbing `staleness.ts` turned 51 checks red with no resolution errors;
`staleness.test.ts` went 29 for 29. Six mutations, and two of them found checks that were green for
the wrong reason:

- `changedLeaves` dropping its filter for the unknowable killed **nothing**, because `toEqual`
  ignores keys whose value is `undefined`. Four assertions became `toStrictEqual`; the mutation now
  reddens two checks.
- The check for a partly-returned leaf used `onlyIndex(1)` over two fields, so the sibling went
  unanswered too and the expectation was `toEqual([])` — a red there could have meant either rule
  broke. It now answers the sibling in full and expects `["title"]`.

**Comments.** 25 blocks judged by a fresh reader; 5 deleted, 8 reworded, 2 turned into code, 10
kept. Density was never the problem — 2 inline lines over 681 of added code. What the audit found
was claims wider than the code:

- *"The `!` keeps it outside the hex values"* — false as a reason: `unanswered` already fails the
  pattern on length and characters. Replaced by a check that the marker never matches
  `SOURCE_HASH_PATTERN`.
- *"One value outside these three demotes the whole record: stale"* — two overclaims. Only the one
  fingerprint is demoted, not the record, and a demoted source fingerprint is not stale while the
  editor's dismissal still matches. The surviving fact moved to `parseSourceFingerprint`.
- *"Readers branch on this, never on the raw claim"* — `claimOf` branches on the raw value itself,
  and the tag does not force a reader to separate `unanswered` from `none`; it forces narrowing
  before `.hash`. Reworded to say that.
- **The second pin did not test what its text said.** With the brand removed, `SourceHash = string`,
  the assignment `const _: SourceHash = recorded` still failed on `null` — so the directive never
  went unused and the marker half was unpinned. Narrowing the subject to
  `Exclude<RecordedClaim, typeof DECLINED>` fixes it: removing the brand now reddens **both** pins.
- `LeafOutcome.answered` became **`answeredInFull`**, and its docblock went with it. The auditor
  proposed `everyChunkWritten`; that was declined because chunks disappear at step S while
  `LeafOutcome` survives, and the receipt's vocabulary should not name the mechanism that is going.
- `applyContainer` became `tryApplyContainer`, since the diff gave it a `boolean` the call site
  depends on.

One verdict was applied in its fallback form rather than as written: the `TODO(core-deps)` note was
marked for deletion, and is instead moved beside the `zod` import it is about, naming the plan file
that records the decision — the diff had stranded it on top of an unrelated docblock.

Checked and not a defect: `tryApplyContainer` returns `false` for a container with no `children`
array, but a container only reaches the applicator by having produced inline fragments, so the guard
is defensive rather than a reachable path.

**After all four:** 179 files / 2398 checks · `check-types` 0 · `oxlint` 44 warnings, 0 errors ·
`turbo run build` green, which is the real `tsc` declaration emit rather than `tsgo`.
