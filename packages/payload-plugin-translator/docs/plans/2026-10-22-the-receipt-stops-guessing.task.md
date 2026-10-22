# The receipt stops guessing who wrote the target text

**Status:** in progress · **Risk:** high · **Lands in:** #198

## Requirements / Task restatement

A provenance receipt records, per leaf, one of three claims: the source hash, `UNANSWERED`, or
`DECLINED` (`null`). `ProvenanceService.previousClaim` writes `DECLINED` for every leaf a run saw in
`currentFields` but did not send. `staleness.ts:claimOf` collapses `DECLINED` with "the receipt has
no entry" into one state, `leafSourceChanged` answers `undefined`, and `SkipExistingStrategy` reads
that as *leave it alone* — permanently, however far the source drifts.

The result is a plugin that protects one kind of hand-written text and destroys another, with
nothing an editor can see to tell them apart:

| Target field | Protected from `skip_existing` today |
|---|---|
| a human filled it, the plugin never wrote it | **yes**, for ever |
| the plugin wrote it, a human then corrected it | **no** — overwritten once the source moves |

**The rule this change implements, settled with the owner:** automatic translation takes every leaf
whose source moved. It does not infer who last touched the target. Where a field must be left alone,
that is an explicit mark a person sets — never a guess the plugin makes from its own records.

### What this reverses, deliberately

`README.md:104` promises "**Protect hand-written copy** — the `skip_existing` strategy fills only
empty target fields". `docs/plans/2026-10-02-per-field-fingerprints.task.md:95-99` (D4) records the
same as a safety rule. Both are reversed on purpose.

Two facts make that affordable, and both were checked: the package is at `1.0.0-next.3` under the
`next` dist-tag, and the major does not ship until epic #192 is complete — including #48, which
replaces the strategy with a field picker, so the editor's replacement for the lost protection lands
in the same release. Nothing reaches a stable consumer in between.

## What already exists — platform · installed · project · verdict

Nothing new is built. The change removes a state from an existing vocabulary and narrows one
function. The explicit per-field opt-out this rule leans on already exists —
`custom.translateKit.exclude`, read by `getFieldConfig.ts` and honoured in
`translatableLeaf.ts:isTranslatableLeaf` before either strategy is consulted.

## Decisions

**D1 — the receipt is a watermark of the source, not a claim of authorship.** Per leaf it records
"as of the last run, this leaf's source hashed to H", whether the run translated the leaf or skipped
it. *Rejected:* also recording a hash of the target text the run wrote, so the plugin could
recognise its own output and spare it. That is a better guess, but still a guess, and it produces
behaviour a person can neither predict nor see.

**D2 — `DECLINED` leaves the written vocabulary.** `RecordedClaim` becomes `SourceHash |
UNANSWERED`. *Rejected:* changing only the writer and leaving the readers to honour a stored `null`
— old receipts would then keep protecting their leaves until some run happened to translate
something on that document, which under `skip_existing` may be months, so neighbouring documents
would behave differently with no visible cause.

**D3 — `UNANSWERED` stays, and still latches.** A leaf the run sent and never got back holds seated
source text in its target while its source has not moved, so a watermark alone would never bring a
run back to it. `previousClaim` is narrowed to that one job rather than deleted.

**D4 — a stored legacy `null` is read as "revisit this leaf", mapped at the parse boundary.**
*Decided while building; see "One correction made while building" below.* The parse keeps accepting
`null` and turns it into `UNANSWERED`, so nothing downstream ever sees a third state.
*Rejected:* dropping the `z.null()` arm from the schema. That makes one legacy value fail the map
parse, which degrades the **whole** record to the legacy document digest — and a degraded record
answers no leaf at all, so under `skip_existing` with no empty target the run selects nothing,
writes nothing, and the document stays degraded indefinitely. It is the opposite of the intended
outcome.

**D5 — the notification surface is out of scope.** `docs/plans/2026-10-18-the-rewiring.md` D21 says
*"The overwriting is accepted; being silent about it is not."* That obligation is not discharged
here. *Why:* overwriting without notice already exists today under `overwrite`, which is the default
strategy for auto-translate (`AutoTranslate.policy.ts:34`), so this change does not introduce it.
The surface belongs with #48, where the picker gives a person something to decide with. Building one
now would be an abstraction with no second caller. Carried to "Open, not solved here".

### Placement

Every change lands in the three files that already own this vocabulary —
`core/domain/provenance/SourceFingerprint.ts` (what may be stored),
`core/domain/provenance/staleness.ts` (how it is read), and
`server/modules/provenance/Provenance.service.ts` (how it is written). The translation pipeline is
untouched: `SkipExistingStrategy` already reads `sourceChanged === true` and simply starts receiving
a boolean where it received `undefined`.

### New surface — the shape check

Triggers fired: **one**. `previousClaim` changes signature (an exported-within-module function gains
a parameter). No field is added to a published type; nothing becomes optional.

Two shapes were considered for the function that decides a leaf the run did not send:

| | `previousClaim(previous, address): RecordedClaim \| undefined`, caller defaults to the hash | `claimForUnsent(previous, address, hash): RecordedClaim` |
|---|---|---|
| cost of the next claim kind | one branch here, one at the call site | one branch here |
| states admitted vs produced | 3 admitted, 2 produced — `undefined` means "use the hash", which only the caller knows | 2 and 2 |
| second caller | none | none |
| breaks outside the repo | nothing; module-private | nothing; module-private |

Chosen: `claimForUnsent`. The first shape needs an optional return whose meaning lives at the call
site, which is the dishonest shape the check exists to catch. It also reads as the mirror of the
existing `claimFor`, which is what the two arms of this decision are.

### Written contract

`claimForUnsent` owes callers something its signature cannot state: that `hash` is the **current**
source hash for `address`, not a historic one. Stated in its docblock; the only caller passes it
from the same `Object.entries(currentFields)` iteration that supplies `address`.

### Escalate to `/sp-architect`?

No. One module, no new seam, no new dependency. The data-model change is a state leaving a union
that the plugin alone reads and writes, and its migration is decided in D4.

## One correction made while building

**AC5 falsified the plan's own reading of the schema.** The plan said that dropping the `z.null()`
arm would make a legacy receipt "degrade to the legacy digest — which for this data is the desired
outcome (unknown, re-translate)". Traced against the code, the second half is false: a degraded
record makes `recordsEachLeaf` false, so `changedLeaves` returns `{}`, so `sourceChanged` is
`undefined` for **every** leaf, so `skip_existing` fills only empty targets — and if none are empty
the pipeline selects nothing, `handler.ts` skips `record`, and the receipt is never rewritten. The
document would be stuck worse off than before. D4 is the corrected decision.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | A leaf the run saw and skipped is recorded with the current source hash, not `null` | `bunx vitest run src/server/modules/provenance/__tests__/Provenance.service.test.ts` | the stored map holds a hash at that address |
| AC2 | A leaf whose source then moves is re-selected under `skip_existing`, whoever filled the target | `bunx vitest run src/core/domain/provenance/__tests__/theWatermark.test.ts` | `changedLeaves` marks it, `SkipExistingStrategy.shouldTranslate` returns `true` over a non-empty target |
| AC3 | A document holding such a leaf reads stale once its source moves | same file | `isRecordStale` is `true` |
| AC4 | `UNANSWERED` still latches across a run that does not send the leaf | `bunx vitest run src/core/translation-pipeline/__tests__/theLeafThatNeverCameBack.test.ts` | unchanged — invariant |
| AC5 | A receipt stored before this change, holding `null`, no longer protects its leaf | same file as AC2 | the record still parses per-leaf, and the leaf reads as changed |
| AC6 | `overwrite` behaviour is identical | `bunx vitest run src/core/translation-pipeline/strategies/` | unchanged — invariant |
| AC7 | The compiler refuses a reader that does not name every remaining state | remove a branch from `claimOf`, run `bun run check-types` | at least one type error |
| AC8 | Nothing else moves | `bunx vitest run` · `bun run check-types` · `bunx oxlint .` · `bunx turbo run build --filter='./packages/payload-plugin-translator'` | suite green, 0 type errors, 0 lint errors and ≤44 warnings, build green |

## Pre-flight — each check run against the untouched tree

| AC | Result on the base | Classification |
|---|---|---|
| AC1 | passes — asserts `null` today | **change**: must be inverted, so the assertion is rewritten and fails first |
| AC2, AC3, AC5 | no such file | **change** — fails now |
| AC4 | passing | **invariant** |
| AC6 | passing | **invariant** |
| AC7 | n/a before the change | **change** |
| AC8 | 179 files / 2398 checks, 0 type errors, 44 warnings | **invariant** |

## Risk notes

**High.** The change alters what is written into stored receipts and which fields an automatic run
overwrites. Three consequences, all accepted:

- a target a person filled or corrected is overwritten once its source moves, under `skip_existing`;
- a document whose receipt holds legacy `null`s reads stale until one run rewrites it, and that run
  re-translates those leaves once;
- the "Re-translate" button under the stale badge hardcodes `skip_existing` precisely to avoid
  discarding a reviewer's edit (`TranslationStatusList.tsx:71-72`); that reason stops being true and
  the comment is removed rather than left lying.

## Human choices

- **The rule itself** — "translate everything whose source moved; do not infer who touched the
  target" — is the owner's, given in this session. The alternative they rejected was inferring
  authorship from a stored hash of our own output.
- **Timing.** The owner settled that no separate sequencing risk exists, because the major ships
  only when the whole epic including #48 is done, so the field picker arrives in the same release.
- **Scope of the notification obligation (D5)** was decided by the implementer under instruction to
  decide rather than ask. It is recorded for the owner to overrule.

## Open, not solved here

- **A run that overwrites a person's text says nothing about it.** Owed by D21 of the rewiring
  design; see D5 for why it is not discharged here. Belongs with #48.
- **An emptied-then-refilled source is never re-translated.** `computeFieldFingerprints` drops a
  leaf with empty source text, so `record` drops its address. When the source is refilled, the
  receipt has no entry, `leafSourceChanged` answers `undefined`, and `skip_existing` keeps the old
  target. **Pre-existing** — `record` has always iterated `currentFields` and this diff does not
  touch that line — but it is the one place where "translate everything whose source moved" still
  does not hold. The fix is a decision about what an absent address means once a receipt is
  per-leaf, which is the owner's and belongs with #48.
- **Dismissal hides the badge and does not stop the next run.** `changedLeaves` reads only
  `sourceFingerprint`, so a dismissed locale is still re-translated. Pre-existing, and the button's
  title was corrected here to promise only the hiding.
- **A legacy `null` on a leaf whose source is now empty never clears.** That leaf is never sent, so
  its `UNANSWERED` is carried forward and the locale keeps flagging until the source has text again.
  Recorded in `docs/DEPRECATIONS.md`.
- Carried forward from the previous task and still open: a run that answered nothing writes a
  receipt with a fresh `translatedAt`; the field-level endpoint writes no receipt at all.

## Review log

### Three review angles and a comment audit, over the finished change

**The recording rule, over every reachable combination.** Two findings raised as major; both
checked against the code and **declined, with evidence**:

- *"An emptied-then-refilled source is never re-translated."* Real, and now recorded above — but
  **not introduced here**. `git diff` over `Provenance.service.ts` shows the `Object.entries(currentFields)`
  loop untouched; the address has always been dropped when the source goes empty.
- *"A run that re-bases from a legacy digest silently clears real drift — before this change the
  document kept reading stale."* The second half is false. `git show HEAD:…/staleness.ts` has
  `if (claim.kind === "none") return true;` in `matchesClaim`, so a declined leaf matched and the
  document read **not** stale before this change too. The information loss is identical; what the
  change adds is that the leaf becomes eligible again when its source next moves.

A third finding, that the `UNANSWERED` latch might be unreachable-but-harmful, was investigated and
left as it is: the reviewer found no reachable path, and `currentFields` already excludes a leaf
that produces no chunk.

**The behaviour reversal in the open.** This angle found the most important defect in the change and
it was mine: **the rewritten README overclaimed.** `provenance` defaults to `false` (README:162),
and with it off `changedLeaves` returns `{}`, so `skip_existing` behaves exactly as before. The
refresh also needs a per-leaf receipt to exist already. Five statements were corrected to say so —
README:104, README:239, README:264, the strategy tooltip, and the DEPRECATIONS entry.

Four more applied: the public JSDoc on `AutoTranslateStrategy` still promised "leaving existing
translations untouched"; `translateContent.ts` still said "target wins when non-empty under
`skip_existing`"; the DEPRECATIONS claim that a legacy `null` is revisited "once" holds only for a
leaf a run actually sends; and the "Keep as is" button promised to keep the text while only hiding
the notice.

**The label change is reverted, and the owner should know why.** The owner agreed that "Out of date"
reads as a verdict and asked for wording closer to "the source changed". `isRecordStale` is true in
four cases, and in two of them the source did **not** change: a leaf recorded `UNANSWERED`, and a
legacy `null` read as one. "Source changed" would be false on screen and in the accessible name, so
`STATE_LABEL.stale` and the panel title are back to "Out of date". A wording that is both accurate
and non-accusatory needs the unanswered case separated from drift, which is more than a string.

**What the suite still guards.** Nine mutations, run one at a time; none went uncaught. Two gaps the
reviewer named were closed: the round-trip check passed when the parse returned `null` (tightened to
an exact serialization), and `isRecordStale` over a legacy receipt was untested (added). One check I
had added was removed on its advice — the type now makes an unanswerable claim unconstructible, so
it guarded nothing the compiler did not.

**Comments.** 12 blocks judged. Three pre-existing comments were **stranded false** by the change
and rewritten: `record`'s docblock still said the map is merged and a skipped leaf keeps its claim;
`UNANSWERED`'s still said "sent and never got back", which no longer covers a legacy decline; and a
test comment still said "not-ours". My own `claimForUnsent` docblock was wrong in both halves of its
stated cause and was replaced. My rewrite of the refresh button's comment was wrong too — the old
reason still holds, since `overwrite` would still replace edits on leaves whose source never moved —
so the function was renamed `refreshChangedLeaves` and the comment deleted.

**One code change came from the audit.** `Claim` lost its third arm. `matchesClaim`'s `unknown`
branch was dead (its argument always comes from `Object.entries`), and absence is now handled at the
lookup with `Object.hasOwn`, which also fixes a pre-existing read of `Object.prototype` keys —
`leafSourceChanged(recorded, now, "constructor")` used to answer `true`.

**Final state:** 180 files / 2407 checks · integration 58 files / 235 checks · `check-types` 0 across
all nine workspaces · `oxlint` 44 warnings, 0 errors · `turbo run build` green · `sp-diff-checks`
clean · `sp-lint-delta` introduced nothing.
