# Task contract — document host-side pruning of the job table, export nothing (#122)

Follows [#108](https://github.com/focusreactive/payload-plugins/issues/108), which removed the only
thing that pruned the job table, and closes #122 as *won't build*.

**Risk: LOW.** Documentation plus a two-line correction. No behaviour change, no new public surface.

## Design decisions

**D1 — retention stays out of the plugin.**
The user's call. How long to keep translation history is the host's policy — the same class of decision
as the `jobs.deleteJobOnComplete: false` that creates the situation — and Payload already gives the host
cron to act on it. Rejected: a `retention` option with a schedule. It needs a default nobody can pick
well, and getting it wrong deletes history a host explicitly asked to keep.

**D2 — export no constant, no helper, no config object.**
Considered in that order and all three rejected. The decisive fact is that the task name is
*configuration*, not a library constant: `taskName` is an option on `createPayloadJobsRunner` and
`"translate_document"` is only its default. A host who set their own name and imported ours would get a
query that silently deletes nothing — the exact failure the export was supposed to prevent.

Confirmed rather than assumed: `taskName` and `taskSlug` appear **nowhere** outside
`server/modules/task-runner/payload-jobs-runner/`. The name is a detail of one runner implementation —
`createSyncRunner` has no queue and no job table at all — so exporting it from `src/index.ts` would
publish at plugin level something true only for one runner choice.

A helper that builds the where clause was rejected for a second reason: it is the retention machinery
D1 declined, under another name.

**D3 — the README example names the coupling instead of hiding it.**
It tells the reader to use the same value they passed as `taskName`, and states the default. Someone who
customised it meets the requirement at the moment they copy the snippet.

**New surface:** none. **Written contract owed:** none. **Escalate:** no.

## Verified before writing the documentation

The query was run against all three adapters, not reasoned about. Fixture per adapter: 3 jobs completed
40 days ago, 2 completed a minute ago, 2 not completed. Cutoff at 30 days.

| adapter | before | deleted | left |
|---|---|---|---|
| sqlite | 7 | **3** | 4 |
| postgres | 7 | **3** | 4 |
| mongo | 7 | **3** | 4 |

`taskSlug` and `completedAt` are real columns and `exists` / `less_than` are ordinary operators, so no
JSON-path traversal is involved — which is why the behaviour is identical everywhere.

## Corrected during investigation

**The polling worry was wrong.** The task brief said deleting a recently-completed job could pull a row
out from under a reader. `useCollectionTranslationStatus.ts:44-49` and `useDocumentTranslation.ts:49`
set `refetchInterval` to `false` unless something is `PENDING` or `RUNNING`, so polling stops once work
finishes. A time offset is still right, but for an ordinary reason — someone may open the panel to read
recent history — not to avoid a race.

**Only one identifier matters.** `queueName` groups execution; ownership is carried by `taskSlug`. The
first draft would have documented both and implied the queue was needed for the query.

## Acceptance criteria

1. **README documents the pruning query**, with the runner caveat (`createSyncRunner` writes no jobs)
   and the `taskName` coupling. *Check: read the rendered section.*
2. **The documented query is the one that was run**, not a retyped variant. *Check: compare the snippet
   against the where clause in the table above.*
3. **`@since` corrected** from `0.12.0` to `0.11.2` in `toTaskFilter.ts` and `TaskRunner.interface.ts` —
   0.11.2 is what shipped. *Check: `grep -rn "@since 0.12" src` returns nothing.*
4. **No new export.** *Check: `src/index.ts` is untouched by this diff.*
5. **Checks clean:** check-types both packages, unit tests, lint at the repo baseline.
6. **#122 closed** with the reasoning and a pointer to the documentation.

## Human choices

- **Do not build retention** (D1), and on the follow-up question **export nothing at all** (D2). The
  user reframed it from "what is convenient to import" to "whose responsibility is this", which is what
  settled it.

## Risks

- A host who never reads the README sees the table grow. Accepted: the same exposure as
  `deleteJobOnComplete: false` itself, which is also theirs to set.
- #123 stays open — the status endpoints still read a collection's history unpaginated. Host-side
  pruning bounds what they read without the plugin choosing the policy.

## Review log

**2026-09-04 — verification.** All six criteria met. The pruning query was run against SQLite, Postgres
and MongoDB before it was written down (table above), so criterion 2 compares the documented snippet to
something that actually executed rather than to a plausible draft. `grep -rn "@since 0.12" src`
returns nothing; `src/index.ts` is untouched, which is criterion 4 and also the whole of D2. Checks:
1320 unit tests, check-types clean in both packages, lint at the 59-warning repo baseline.
