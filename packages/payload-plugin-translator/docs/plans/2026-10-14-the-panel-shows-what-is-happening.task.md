# The collection panel shows what is happening, not what has happened

Follows: 2026-10-12-bound-the-status-reads.task.md

## Requirements / Task restatement

`GET /translate/collection/:slug` calls `findByCollection(collectionSlug)` with no filter
(`get-collection-status/handler.ts:38`), so it reads the collection's whole job history to draw four
numbers. The previous task narrowed that read to one collection; this one bounds it outright, by
changing what the panel is for.

**The panel answers "what is this collection doing", not "what has it ever done".** It aggregates:
a translation started from a document, or by the auto-translate hook, shows up here too. It has no
life of its own.

- **`Translated` goes away.** Not because the count is expensive but because nobody acts on it.
  "Is my document translated" is answered by `GET /translate/document/:slug/:id`, which is complete
  and, since the previous task, cheap. A collection-wide total is a statistic, and it can never be
  both bounded and true.
- **`Failed` stays, bounded by a window**, and says so in the row. A failure is a call to action,
  and it is the one figure a window improves rather than damages: a failure from three months ago
  is not an action.

## What already exists — platform · installed · project · verdict

- **Platform.** Every field this needs is a **real column** on the job row — `completedAt`,
  `hasError`, `processing`, plus Payload's automatic `createdAt` / `updatedAt`
  (`node_modules/payload/dist/queues/config/collection.js`). No path inside the `json` input is
  involved, so no adapter-specific behaviour is in play at all.
- **Project.** `TaskFilter` (`TaskRunner.interface.ts`) already carries `excludeCompleted`, a filter
  that narrows the same read and is honoured by both runners. `TranslatorPluginConfig`
  (`plugin.ts:19`) already carries optional settings with documented defaults — `basePath`,
  `levels`, `provenance`. The client already renders nothing for a zero count
  (`CollectionTranslationProgress.tsx:64`).
- **Verdict.** Nothing new is built. One optional field joins an existing filter, one row leaves an
  existing list, one optional setting joins an existing options type.

## Decisions

### D1 — the bound is a second field on `TaskFilter`, not a new query path

**Chosen:** `TaskFilter` gains one optional field meaning "drop failures older than this". It
composes with `excludeCompleted`, which already means "drop successes", so the panel asks for both
and gets exactly the live-plus-recently-failed set.

The query the Payload runner then sends:

```
and: [
  { completedAt: { exists: false } },                                   // from excludeCompleted
  { or: [ { hasError: { not_equals: true } },                           // still in flight
          { updatedAt: { greater_than: cutoff } } ] },                  // or failed recently
]
```

**What lost, and why:** a dedicated method on `TaskRunner` lost for the reason the previous task
recorded at length — a capability bolted onto the execution contract that only one runner can answer
(`2026-10-12-bound-the-status-reads.task.md`, *Why Stage B was withdrawn*). Reading everything and
dropping stale failures in memory lost because failures are exactly what accumulates: it would leave
the read bounded by the project's whole failure history, which is the defect being fixed.

**The constraint it cites:** `excludeCompleted` is the existing precedent for narrowing this same
call, it is already implemented by `PayloadJobsTaskRunner` and `SyncTaskRunner`, and it is already
used by a second caller (`cancel-by-collection/handler.ts:30`).

### D2 — a runner that ignores the new field degrades, it does not break

`TaskFilter` is re-exported from `src/index.ts`, so a third-party runner reads it. The field is
optional and a runner that does not honour it returns **more** rows than asked — stale failures in
the panel, never missing work. That is the same shape as `excludeCompleted`, whose docblock already
describes what it drops rather than demanding it.

### D3 — the endpoint reports the window; the client does not learn it separately

The `Failed` row has to name the window, so the client needs the number.

**Chosen:** `GET /translate/collection/:slug` answers with the window alongside `docs`, and the client
renders what it was given.

**What lost, and why:** carrying it through `TranslateKitConfigProvider` — which today holds only
`basePath` (`TranslateKitConfigContext.tsx:6`) — would mean plumbing a second value across the admin
boundary, and worse, the label could then disagree with the cutoff the query actually used. Taking
both from one place makes the label unable to lie.

### D4 — the panel gets a rendered test, and the package gets the setup for one

The component had no test and the package had no way to write one: `vitest.config.ts` sets
`environment: "node"` and nothing DOM-related was installed.

**Chosen, by the owner before implementation:** add `jsdom`, `@testing-library/react` and
`@testing-library/dom` as dev dependencies of **this package only**, and opt the one client test into
`jsdom` with a per-file `@vitest-environment` docblock rather than switching the package's 148 other
test files.

**What lost, and why:** asserting over the exported `ROWS` list and a label helper would have needed
no dependency, but it checks the data the panel is built from rather than what it renders — and the
criterion is about what an editor sees.

**The constraint it cites:** this is not new to the repository. `payload-plugin-visual-editing` and
`payload-plugin-analytics` already declare both, `apps/cms` and `apps/dev` already declare `jsdom`,
and each does so in its own `package.json`. Versions here match `apps/cms` / `apps/dev` exactly
(`16.3.0`, `26.1.0`) because `bunfig.toml` hoists, and two ranges of one package in one tree is a
hazard worth not creating.

### D5 — a locale is failed only once its run has given up

**Added during implementation, with the owner's approval, after review found that the window's
safety argument did not survive contact with how a locale's status is derived.**

Payload appends a log entry with `state: 'failed'` on **every** failed attempt, and marks the job
itself only when it gives up — `queues/errors/handleTaskError.js:110-119` pushes the entry while
setting `hasError: hasFinalError`. `normalizeJobLocales` read that entry alone and called the locale
failed, so a locale that was **still being retried** was reported as a failure. Measured, not
reasoned: a seeded job with a failed log entry and `hasError: false` answered `failed` where it owed
`pending`.

That defect predates this task — `normalizeJob.ts` is untouched by the rest of the diff — but this
task is what makes it harmful: the new row tells the reader "open a document to see why" about work
that may still succeed on its own.

**Chosen:** a locale is `completed` on its own evidence — its own log entry succeeded — and anything
else falls back to the **run's** status rather than being called failed.

**What lost, and why:** leaving the derivation alone and softening the row's wording would have kept
the task smaller, but it leaves a counter that is wrong wherever it is read, including the document
panel. The owner chose the fix over the wording.

**What it costs, stated plainly:** a locale whose last attempt failed is now indistinguishable from
one never attempted — both read `pending` while the run still owes them. That information is not
lost, only moved: the job's own log still records which locale failed, and
`locale-workflow-failure.int.test.ts` asserts it there.

### Placement

| Piece | Lands in |
|---|---|
| the filter field | `modules/task-runner/TaskRunner.interface.ts` — `TaskFilter` |
| the query | `payload-jobs-runner/PayloadJobsTaskRunner.ts` — `findByCollection` |
| the in-memory equivalent | `sync-runner/SyncTaskRunner.ts` — `findByCollection` |
| the window's value | `plugin.ts` → `createTranslationRoutes` → `GetCollectionStatusConfig` |
| asking for it | `features/get-collection-status/handler.ts` |
| the row and its label | `client/features/collection-translation-progress/ui/CollectionTranslationProgress.tsx` |
| the window on the wire | `features/get-collection-status/model.ts` — the output type |

### New surface

- One optional field on `TaskFilter` — callers: `get-collection-status/handler.ts`; implementers:
  both runners.
- One optional setting on `TranslatorPluginConfig`, if the window is to be configurable (an open
  question for the owner; decided below).

No new abstraction, no new file, no new module.

### Written contract?

**One thing a signature cannot state, and it is the reason the window works at all:** `hasError` is
set only when a run has **finally** given up — a run still retrying does not carry it
(`handleTaskError`). So the "in flight" branch keeps retrying work, and a failure becomes visible
only when it is certain, which is the same moment `onFailed` fires. That belongs in the field's
docblock; it is not something an implementer can infer from the name.

### Does this need a separate design?

**No.** One optional field on an existing filter, one row removed from a list. No new seam, no
dependency, no data-model change, no migration.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | `GET /translate/collection/:slug` returns no entry for a run that completed | new integration test: translate, let it finish, read the panel | no entry carries status `completed` |
| AC2 | It still returns a run that is queued or running | new integration test with `autoRun: false`, so the run stays queued | the queued locale is present |
| AC3 | It returns a run that failed inside the window | new integration test seeding a job with `hasError` and a recent `updatedAt` | the failed entry is present |
| AC4 | It does **not** return a run that failed before the window | same test, a second job with an old `updatedAt` | that entry is absent |
| AC5 | The job table is not read for completed rows at all | the same read-watching probe the sibling spec uses (`status-reads-are-bounded.int.test.ts`) | no row with `completedAt` set is loaded |
| AC6 | A run still retrying is reported as in flight, not as failed | new integration test: a job with an error but `hasError` unset | present, and not counted failed |
| AC7 | The panel no longer offers a `Translated` row | **new** rendered test for `CollectionTranslationProgress`, under `@vitest-environment jsdom` | a panel given a completed count renders no row naming it |
| AC8 | The `Failed` row names the window | the same rendered test | the rendered failed row's text contains the number of days |
| AC9 | `SyncTaskRunner` honours the new filter | new unit case in its existing test file | an old failure is dropped, a recent one kept |
| AC10 | The other two callers of `findByCollection` are unaffected | `bunx vitest run src/server/features/cancel-by-collection src/server/features/get-document-status` | stays green |
| AC11 | No new type errors, in either project of the dev app | `bun run check-types` in the package and in `apps/dev`; `bunx tsc --noEmit -p tsconfig.json` in `apps/dev` | package and `apps/dev` clean; the app's own count stays at 2, both in files this task does not touch |
| AC12 | No new lint findings | `bunx oxlint .` in the package; `bunx oxlint src` in `apps/dev` | 47 and 5, or fewer |
| AC13 | Nothing already passing regressed | `bunx vitest run`; `bun run test:integration:{sqlite,postgres,mongo}` | ≥ 2060 unit; ≥ 229 / 234 / 227 integration |

## Pre-flight

Run against the untouched tree on `feat/translator-bound-status-reads`, before any edit.

| AC | Command | Result | Classification |
|---|---|---|---|
| AC1–AC6, AC9 | the named tests | do not exist yet | change — each gets its red run during implementation |
| AC7, AC8 | the client panel test | **the component had no test and the package had no DOM environment** — both added before implementation, see D4 | change — the test is written during implementation and goes red against the current `ROWS` list |
| AC10 | `bunx vitest run src/server/features/cancel-by-collection src/server/features/get-document-status` | 32 passed | invariant |
| AC11 | the three type-check commands | package **0**, `apps/dev` **0**, app project **2** | invariant |
| AC12 | `bunx oxlint .` · `bunx oxlint src` | **47** · **5** | invariant |
| AC13 | `bunx vitest run` · the three integration runs | 2060 · 229 / 234 / 227 | invariant (baseline) |

## Risk notes

**Risk classification: LOW.** One optional field on a filter that already exists and is already
honoured by both runners; one row removed from a client list; no stored shape, no migration, no new
method on any contract, no response-shape change. That buys: one review pass rather than three, and
a regression sweep over the three callers of `findByCollection` rather than an
evidenced sweep of everything.

**Hazards:**

- `excludeCompleted`'s docblock says it "keeps running and failed ones — everything a re-enqueue can
  still supersede". The new field narrows that set, so the two docblocks have to agree or the next
  reader will believe the wrong one.
- `cancel-by-collection` passes `excludeCompleted: true` and must keep seeing **every** cancellable
  run, including an old failure. It must not acquire the new field by accident.
- A window is a behaviour change the panel's own tests cannot see without a clock. Seeding
  `updatedAt` directly is the only honest way to test the boundary, which means writing through the
  adapter rather than through the field.

## Decisions by the owner

- **2026-10-14** — drop `Translated`, keep `Failed` windowed. The reasoning: the two rows are not equivalent — a failure is a call to action
  and an old one stops being one, while a translated count is a statistic nobody acts on.
- **2026-10-14** — the collection panel is an aggregator with no life of its own: a translation
  started from a document shows at the collection level too.
- **2026-10-14** — the window is a plugin setting defaulting to 3 days, not a constant.
- **2026-10-14** — the `Failed` row keeps its heading and carries the window in the small line beneath
  it, where "Open a document to see why" already sits.
- **2026-10-14** — add the DOM test setup rather than testing the panel's data. See
  D4 for what that cost and why it is confined to this package.
- **2026-10-14** — fix the status derivation in `normalizeJob.ts` rather than soften the row's
  wording, accepting that it changes what the document panel shows for a locale whose attempt
  failed. See D5.

### D6 — the filter field is named for giving up, not for failing

An abstraction review measured the strongest thing a caller must agree with this boundary about, and
it was **meaning**: `excludeFailedBefore` said "failed" while the rule is "gave up". A third-party
runner reading the name alone would drop a run that failed one attempt and is still retrying, and
work in flight would vanish from the panel. Only the docblock said otherwise.

**Chosen:** `excludeGivenUpBefore`. The meaning moves from prose into the name, and the docblock
keeps only what the name cannot carry — that the queue gives up after the last retry, with its
citation. Free now: the field ships first in 0.17.0, so nobody outside has it yet.

### D7 — the panel does not show locales finished inside work still in flight

Measured during the same review: a live run reports `de=completed fr=pending es=pending`, so the
response does carry completed locales — bounded ones, since they exist only inside runs that have
not finished. The panel discards them.

**Decided: leave it.** This is not the lifetime total D1 removed, and showing it would be defensible
— it is the progress figure the owner originally asked for. But it drains to zero as runs finish
rather than settling at "30 of 30", which is the behaviour the panel was deliberately moved away
from. The omission is now **structural rather than silent**: `ReportedStatus` excludes
`COMPLETED`, so `ROWS` cannot name a row the panel does not count and the query cannot fill one.

## Review log

**2026-10-14 — one review pass (low risk).** Confirmed clean: `hasError` really is final-only; the two
other `findByCollection` callers are untouched; a long-quiet but still-pending run is not dropped,
because the window applies only where `hasError` is true; the new DOM dependencies and the
`*.test.tsx` include leave the other 148 test files on `node`.

**One major finding, verified and fixed — D5.** The review showed that the window's safety argument
held for the field being filtered on but not for the status being displayed. Reproduced it with a
seeded row before acting, then fixed the derivation. The finding also exposed that AC6 asserted
presence but not status; the criterion's own test was tightened before the fix, and went red.

A second, speculative concern — a backoff gap longer than the window — was traced and did not bite:
the window applies only to runs carrying `hasError`, and a run between retries does not.
