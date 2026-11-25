# The ending names what happened

Requirements: `docs/plans/2026-11-19-fewer-worlds-louder-refusals.design.md`
Build step: 2026-11-19-fewer-worlds-louder-refusals.design.md #6

Corrects a change made earlier the same day under
`2026-11-24-a-failure-is-visible-and-has-a-way-out.task.md`, which taught the queue workflow to
report an ending for any error and not only for one the plugin threw. Reporting at all was right;
reporting every such ending as a failure was not.

## Requirements / Task restatement

A page was translated into French. The text was written. The panel says the translation failed, and
shows Payload's own validation message.

Nothing about the translation failed. What failed is the queue's record of having finished: a host
that registers a jobs hook makes Payload validate its own job rows, and the row Payload writes on
success omits a field its schema requires. The error arrives after the work, and the plugin hands
the editor a verdict that sends them back to redo something already done.

- R7 (in, part) The admin offers nothing the server cannot answer: a verdict of failure over text
  that is already written is an answer the server does not have.
- R8 (in, part) An ending states what became of the locale. A translation that was written is not
  reported as a failure, whatever happened to the queue afterwards.
- (out) The wording shown for a genuine failure. Payload's internal text is useless to an editor,
  and replacing it is the next piece of work, not this one.
- (out) The external cause, which belongs to the host's plugin set and to Payload.
- (out) Stopping a run from hanging in general, which is its own design.

## What this starts from (measured)

In the owner's sandbox, for the French locale of one page:

- `translator-runs` holds `outcome: failed` with the message
  `The following field is invalid: Status > Log`;
- `_pages_v_locales` holds seven rows for that locale, the newest reading `fr:Home` — the text the
  translation wrote.

So the work landed and the ending contradicts it. The same shape is reproducible in the integration
suite, where the spec that covers this failure asserted the wrong thing and had to be rewritten
before the fix: it demanded that the host be told of a failure.

- `PayloadJobsRunnerProvider.ts:189-210` catches the error and, since this morning, always ends the
  locale as `failed`.
- The signal that separates the two cases is already there and already kept: a map filled only by
  this plugin's own task handler (`:140`), which records what that handler threw.
- An entry in that map means the translation threw. No entry means the handler returned, which
  means `translateDocument` completed, which means the text was written.
- Retrying cannot help: the queue's validation refuses the same row every time, so each attempt
  translates again, writes again and fails again on the same record.

## Decisions

### D1. The ending is chosen by where the error came from

- **Chosen:** read the map of what the plugin's own task threw. An entry ends the locale `failed`
  with that error; no entry ends it `delivered`.
- **Why it bites:** the two cases are not degrees of the same thing. One is a translation that did
  not happen; the other is a translation that happened and was not recorded. Only the first is a
  failure to the editor, and the plugin already knows which it is holding.
- **Rejected — keep reporting `failed` and improve the wording:** a well-phrased verdict that the
  translation failed is still wrong, and it still sends the editor to re-run finished work.
- **Rejected — report nothing when the plugin did not throw:** that is the hang this morning's
  change removed. The record must close either way.
- **Rejected — ask the document whether the text is there:** it would answer the same question the
  map already answers, with a read per failure, and it would call a locale delivered when an
  earlier run had written it.
- **Constraint cited:** R8, and the rule that one locale gets one ending.

### D2. The locales the run never reached keep their own ending

- **Chosen:** `abandoned`, unchanged, for every locale after the one that stopped the run.
- **Why:** nothing was attempted for them, so neither `delivered` nor `failed` describes them.
- **Rejected — deliver them too when the plugin did not throw:** the loop stops at the locale that
  raised, so the ones behind it were never translated.

**New surface:** none — one branch inside an existing catch.
**Written contract owed:** none; the branch carries the reason it exists where it is read.
**Escalate:** no.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R7, R8 | A locale whose translation was written, and whose queue record then failed, ends as `delivered` | the integration spec, reading `outcome` from `translator-runs` | **fails now** — it ends as `failed` |
| AC2 | R8 | The text really is in the document when that ending is written, so the criterion cannot pass on a wrong premise | same case, reading the locale's title from the document | **fails now** — the case did not exist |
| AC3 | R7, R8 | The host is told the locale completed, and is not told it failed | same spec, over both callbacks | **fails now** — `completed: []`, `failed: ['de']` |
| AC4 | R8 | A locale whose translation threw still ends as `failed`, carrying the plugin's own error class | `gave-up-mid-run.int.test.ts` and `final-failure.int.test.ts`, unchanged | **passes now** — stays-true, and the direction this change could break |
| AC5 | R8 | A locale the run never reached still ends as `abandoned` | `gave-up-mid-run.int.test.ts`, unchanged | **passes now** — stays-true |
| AC6 | — | The baselines hold | package suite ≥ 3032 passed / 15 skipped · integration ≥ 307 passed / 7 skipped · `check-types` 10/10 · `oxlint .` ≤ 26 warnings, 0 errors · build exits 0 | **passes now** — measured with the three preceding changes in the tree |

AC4 is the one this change is most likely to break: both endings are decided in the same branch, and
a condition the wrong way round turns every genuine failure into a delivery.

## Risk

**Medium.** One branch, no stored shape, rollback is a revert. The exposure is that `delivered` is
what the admin reads as "translated" and what a host's completion callback fires on, so getting the
condition backwards would announce success over work that never ran.

The judgement the branch rests on — a task handler that returned means the text was written — holds
because the write happens inside that handler and nothing between the write and the return can
swallow a throw. It is measured rather than assumed: the criterion that reads the record also reads
the document.

## Decisions by the owner

- 2026-11-24 — the ending comes first and the wording of a genuine failure second, because a
  well-worded wrong verdict is worse than a badly worded right one.
