# Name what the workflow handler does

## Task restatement

The workflow handler in `PayloadJobsRunnerProvider.configure` interleaves four unrelated
mechanics in twenty lines, and names none of them. The owner read it and said, plainly,
that he could not tell what was happening.

Give the two confusing ones names. **This is a readability change, not a correctness fix.**

## The justification that was proposed and disproved

The task was first argued on a stronger claim: that the `deliveredEarlier` check is correct
only because it sits above the task call, that moving it down would silently break the
plugin, and that no test would catch it. Payload does write the `succeeded` log entry inside
the call (`node_modules/payload/dist/queues/operations/runJobs/runJob/getRunTaskFunction.js:131`),
so the first half is true.

The second half is not. Moving the line below the call, on the untouched tree, turns **four**
integration checks red:

```
completed-handle   → matches for every locale of the request
final-failure      → says nothing while the run is still retrying, and reports success once it works
final-failure      → does not report a locale the run had already translated
gave-up-mid-run    → reports the locale it abandoned, not only the one that spent its own budget
```

The unit suite stays green; the integration suite catches it. So the ordering is load-bearing
*and* guarded, and this change buys clarity rather than safety. Recorded here because the
measurement contradicted the reason the task was opened with, and the weaker reason is the
real one.

**A useful by-product:** those four reds are evidence that this area's tests discriminate. A
later claim that "the suite stayed green" is therefore worth something here, which is not
true of every refactor.

## The design

### D1 — a generator, not a function returning the locale list

```ts
for (const { target, input } of localesAsTheyStand(job)) { … }
```

*Rejected: returning `string[]` and iterating it.* A snapshot is exactly the bug the index
loop exists to avoid: Payload copies the freshly-read row onto the same `job` object after
every task (`getUpdateJobFunction.js`), so a locale appended to a run in flight appears
mid-iteration. Taking an array up front drops it — proven earlier by mutation, which turned
`locale-append.int.test.ts` red with "the appended locale never ran".

A generator is the shape that re-reads on every step, and its name is where the reason
lives.

### D2 — the delivered locales are a set taken once, before anything runs

```ts
const deliveredBefore = deliveredLocales(job);
```

*Rejected: keeping the per-locale check inline.* It works, and the suite guards it. But the
question being asked is "was this locale delivered on an **earlier** pass", and a snapshot
taken before the loop says that in its own shape, while a check inside the loop says it only
by standing in the right place.

### D3 — the `thrown.has(job)` gate stays inline; the third extraction is dropped

**This is a reduction from the shape the owner approved, and it is the one deviation here.**

The proposal was `owedIfOurHandlerGaveUp(job, taskName, target, retryLimit, thrown)`, folding
the gate into the function that already answers what the run will never deliver.

*Rejected after looking at what it would take.* `thrown` is a `WeakMap` living in
`configure`'s closure — a side-channel the handler owns because Payload replaces the
plugin's error with its own. Passing it into `model/` would make a decision function depend
on a channel it has no business knowing, against the module's own rule that `model/` decides
over shapes it does not own. Folding it the other way — changing `owedIfGaveUp`'s own
signature — would force an edit to `owedIfGaveUp.test.ts`, which this task may not touch.

And the ternary is the least confusing of the four mechanics: one line, one question. The
two that earned names are the ones the owner could not read.

### Placement

`payload-jobs-runner/model/` for both, beside `owedIfGaveUp`. They decide what runs next and
what has already been answered for; neither defines a stored shape. The module's declared
direction, `model/ → store/`, is preserved: both read `store/`'s types and nothing in
`store/` learns about them.

### New surface

Two functions, one caller each — the handler. Justified by review cost rather than caller
count, the same criterion the owner set for `contribute`.

### Written contract

`localesAsTheyStand` owes its caller one thing a signature cannot state: **it re-reads the
run's locale list on every step, so a locale appended while the run is in flight is yielded.**
That is the whole reason it is a generator, and it is what its test must pin.

`deliveredLocales` owes: **the answer is about earlier passes only** — it is taken before
anything in this pass runs, and a caller that re-takes it mid-loop gets a different and wrong
answer.

### Escalate to /sp-architect?

No. Two small units inside one module.

**Risk: low.** One handler, two new pure functions, and an area whose tests were just
measured to be sensitive to exactly this code. Phase 5 runs one reviewer.

## Acceptance criteria

| # | Criterion | How it is checked | Passes when |
|---|---|---|---|
| 1 | `localesAsTheyStand` yields every locale of a static list, in order | unit test | asserted |
| 2 | It yields a locale appended to `job.input.target_lngs` after iteration began | unit test mutating the job between steps | the appended locale is yielded |
| 3 | Each yielded `input` carries the run's shared fields plus that one `target_lng`, and no `target_lngs` | unit test | asserted |
| 4 | `deliveredLocales` holds exactly the locales whose latest log entry succeeded | unit test over a log with succeeded, failed and absent locales | set equality |
| 5 | The handler body no longer contains the index loop or the per-locale delivered check | read the file | both gone |
| 6 | The four checks proven sensitive to this code stay green | `completed-handle`, `final-failure` (both), `gave-up-mid-run` on SQLite | all pass |
| 7 | The three mechanisms stay load-bearing — behaviour did not move | `locale-append`, `cancel-while-running`, `final-failure` on SQLite | all pass |
| 8 | The registered `Field[]` is unchanged | existing `__tests__/jobInputFields.test.ts` | stays green |
| 9 | No pre-existing test file was edited | diff the `__tests__` directories | only additions |
| 10 | Unit suite | `bunx vitest run` | ≥ 2045 passing, 0 failing |
| 11 | Integration against a real database | `bun run test:integration:sqlite` | 224 passed / 7 skipped |
| 12 | Types and the real `tsc` declaration build | `turbo run check-types --force`, `turbo run build` | both green |
| 13 | The analyzer gains nothing | `sp-lint-delta.sh --base feat/translator-lifecycle-run-context` | nothing introduced |
| 14 | Nothing outside `payload-jobs-runner/` changed | `git status` filtered through a throwaway index | only those paths |

## Criteria pre-flight — run 2026-10-09 against the untouched tree

| # | Result now | Reading |
|---|---|---|
| 1–4 | fail — neither function exists | correct polarity |
| 5 | fails — both are in the handler | correct |
| 6 | passes, **and measured to be sensitive**: moving one line turns all four red | correct, and unusually meaningful |
| 7 | passes — each was proven load-bearing by mutation earlier | correct |
| 8–13 | pass — 2045 / 146 files, 224 / 7 skipped, 9/9 packages, build green, nothing introduced | correct for must-stay-true criteria |
| 14 | passes trivially | correct |

## Risk notes

- A generator that never terminates if `target_lngs` kept growing. It cannot: it stops at the
  first index the list does not reach, and the list only grows while another request is
  appending, which is bounded by the request.
- `deliveredBefore` is a snapshot, so a locale delivered by this very pass is not in it —
  which is the point, and criterion 6 is what would catch getting it backwards.

## Human choices

- Do it for readability, knowing correctness is already guarded — chosen by the owner after
  the stronger justification was disproved.
- D3's reduction from three new units to two is the agent's call, stated plainly rather than
  slipped in; the owner can overrule it.
- Scope limited to `payload-jobs-runner/`; existing tests not to be edited.
- `README.md` is the owner's. No tracker issues. The git index is not to be touched.

## Review log

_(appended by each review pass)_

### 2026-10-09 · phase 5 verification

- **Checks:** unit 2057/148 files · `turbo run check-types --force` 9/9 · `bunx oxlint` 47 warnings,
  0 errors · `turbo run build` green including the real `tsc` declaration build · integration on
  SQLite 224 passed / 7 skipped.
- **Gates:** `sp-diff-checks` clean, 5 checks; `sp-lint-delta --base feat/translator-lifecycle-run-context`
  nothing introduced — zero, the path artifact of earlier passes is gone too.
- **Reviewer:** one, vector `full` (risk low). It ran the type-check, the real declaration build, the
  whole `payload-jobs-runner` unit suite and six named integration specs itself rather than reading.
- **One finding, taken.** `deliveredLocales` is a snapshot, so a run whose `target_lngs` lists one
  locale twice would be announced `delivered` twice — the old per-locale check saw the first
  occurrence's just-written log entry and stayed quiet. Reproduced, then fixed where the invariant
  belongs: `localesAsTheyStand` now yields a locale once. That restores the old behaviour exactly
  (one translation, one announcement) instead of relying on every writer to de-duplicate first.
  Nothing in the plugin writes a duplicate — `planEnqueue` and `extendJob` both de-duplicate — but
  the list lives in a `json` column a host can write.
- **Order of work:** stubs throwing `not implemented` → 9 checks written against the contract → red
  run 9/9, every failure the stub's own error → implementation → green. The duplicate case was added
  later as a red test against the real new code and then fixed.
- **The guard was proven to survive the recomposition:** moving the `deliveredLocales` snapshot
  inside the loop turns red exactly the four checks that the pre-flight showed are sensitive to this
  code — `completed-handle`, `final-failure` (both), `gave-up-mid-run`. Same four, before and after.
- **Found on the way:** after the recomposition the provider's `latestLogByLocale` import had zero
  uses and the linter does not catch that. Removed; the function itself is still used by the new
  `deliveredLocales` and by `normalizeJobLocales`.
- **Criteria:** 14 of 14 met.
- **Left open:** `thrown` remains a `WeakMap` keyed by the job object, with nothing checking that the
  task handler and the workflow loop see the same object — named in D3 and out of scope.
- **Pin:** not set. The working diff holds four tasks' work and this pass reviewed one task's files;
  a pin would claim more than was verified.
