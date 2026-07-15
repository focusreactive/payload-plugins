# Design — per-locale document status feed (concurrent re-translate fix)

**Date:** 2026-07-15
**Status:** implemented (server + client + tests); collection panel checked and unaffected.
**Kind:** bug fix (correctness) + small contract change, internal to the plugin.
**Relates to:** #50 staleness detection (the status panel this touches shipped in PR #71).

---

## The bug (ground truth)

In the document translation popup's **Status** section, when the source locale (`en`) content changes,
every other locale's translation is marked stale. Clicking **Re-translate from `en`** on several
locales in a row exhibits two defects:

1. Each new click appears to **overwrite the previous locale's status** — only the most recently
   clicked locale shows a running/pending badge; the others fall back to looking merely "stale" even
   though their jobs are in flight.
2. The just-clicked row **jumps to the top** and the list re-sorts on every click.

Both are surface symptoms of one root cause.

## Root cause

The document status feed models **one job per document**, but re-translate queues **one job per target
locale**. The domain is a set keyed by target locale; the plumbing carries a single value. There are
**three** places this single-value assumption is baked in — two read-path, one write-path.

- **Write path — the real culprit for "overwrites the previous" (found in review).**
  `PayloadJobsTaskRunner.enqueue` cancels+**deletes** every existing job for the *document* before
  queuing, scoped only by `(collectionSlug, documentId)` — not by target locale:
  ```ts
  const existing = await this.findByCollection(collectionSlug, documentIds); // ALL locales
  if (existing.length > 0) await this.cancelInternal(existing.map((t) => t.id)); // cancel + delete
  ```
  So re-translating `fr` while `de` is still running physically removes the `de` job. `SyncTaskRunner`
  has the same defect in a different form: its in-memory key `${slug}:${id}` omits the locale, so a
  second locale's task evicts the first. This is what the user observed as one click overwriting the
  previous — the earlier locale's job is gone, not just hidden.
- **Server read — the data is discarded here.** `get-document-status/handler.ts`:
  ```ts
  const tasks = await runner.findByCollection(collectionSlug, [collection_id]); // ALL jobs for the doc
  return ServerResponse.success(tasks[0] ? taskToJobStatusOutput(tasks[0]) : null); // keeps ONE
  ```
  `findByCollection` returns every job for the document (all locales); the handler keeps `tasks[0]`
  (Payload's default order → newest) and drops the rest.
- **Client read — the single job is overlaid onto its one locale.** `model/statusRows.ts`
  (`buildTranslationStatusRows`) takes `run?: DocumentTranslation` and overlays that one job onto its
  `target_lng`. Rows for the other in-flight locales never see their job, so they render from staleness
  alone (`stale`).

### Why each symptom

1. **"Overwrites the previous"** — each click creates a new job; `tasks[0]` becomes that newest job, so
   only the last-clicked locale carries a transient (running/pending) state. The earlier locales'
   running jobs are invisible.
2. **"Jumps to the top"** — the one visible job has a transient state, and the sort
   (`statusRows.ts`, `ORDER`: `failed < running < pending < stale < translated`, then newest `at` first)
   ranks transient states above `stale`/`translated`, so the active row surfaces to the top.

## The fix

Make the document status feed **per target locale**: the server returns the latest job for each target
locale; the client overlays all of them.

### D1 — response contract: single job → array of latest-per-locale

`GET /translate/document/:collection_slug/:collection_id` returns `JobStatusOutput[]` (one entry per
target locale, its latest job) instead of a single `JobStatusOutput | null`.

- **Chosen** over "keep `data` + add a `jobs[]` field": one source of truth. The plugin's server and
  client ship in the same package, so changing the response shape has no external blast radius (the
  route is consumed only by this plugin's own client).
- The handler picks the latest job per `target_lng` (tie-break by `createdAt`/`updatedAt`, newest wins)
  from the `findByCollection` result it already fetches — no extra query.
- `taskToJobStatusOutput` is unchanged (still maps one `Task`); the handler maps the reduced list.

### D2 — client: `useDocumentTranslation` returns `DocumentTranslation[]`

- Query type single → array. `refetchInterval` polls while **any** job is pending/running (today it
  reads `data?.status`).
- The completed→staleness-invalidation effect (`previousStatusRef`, added for #50) must track the set,
  not a scalar: fire when **any** locale transitions `(defined, non-completed) → completed`. Simplest
  correct form: compare the previous vs current set of completed target locales and invalidate staleness
  if it grew. Preserves the #50 behaviour (out-of-date notice clears without waiting for refocus).

### D3 — merge: `buildTranslationStatusRows` overlays all jobs

- Signature `run?: DocumentTranslation` → `runs?: DocumentTranslation[]`.
- Per locale: start from staleness (`stale`/`translated`), then overlay that locale's latest job —
  transient state wins over the durable signal; a job for an unlisted locale adds a row (today's rules,
  applied per locale instead of once).
- Sorting is unchanged. With every active locale now carrying its true transient state, the list is
  stable across successive clicks (each clicked row settles into running/pending rather than one row
  hopping to the top while the rest look stale).

### D4 — supersede jobs per (document, locale), not per document

`PayloadJobsTaskRunner.enqueue` scopes its cancel-existing step to the same `(documentId, targetLng)`
tuples being enqueued, so re-translating one locale never cancels another locale's in-flight job.
`SyncTaskRunner`'s in-memory key gains the target locale (`${slug}:${id}:${targetLng}`). Bulk "translate
all locales" is unaffected — it enqueues every target locale, so each supersedes only its own prior job.

### The capture-before-mutation invariant is untouched

The #50 fingerprint invariant (fingerprint the pristine source before the pipeline mutates it) and
`ProvenanceService` are not involved — D4 changes *which* jobs are cancelled, not how content is hashed.

## Blast radius

- **Write path:** `payload-jobs-runner/PayloadJobsTaskRunner.ts` (locale-scoped supersession),
  `sync-runner/SyncTaskRunner.ts` (locale in the key), + both runner test files.
- **Server read:** `get-document-status/handler.ts` (reduce to latest-per-locale), `get-document-status/model.ts`
  (`latestTaskPerTargetLocale` + response type), `handler.test.ts` + new `model.test.ts`.
- **Client:** `useDocumentTranslation.ts` (type + polling + invalidation effect), `model/statusRows.ts`
  + `statusRows.test.ts`, `model/panelStatus.ts` if it reads the single run, `TranslateDocument.tsx`
  (pass `runs` instead of `data`), `model/types.ts`.
- **Contract:** `JobStatusOutput` single → array. Internal to the package (server + client shipped
  together); `src/index.ts` unaffected — no public API change → **patch** release.

## Verify

- `check-types` clean · `lint` 0 errors · `vitest run` green.
- New/updated tests: (a) `enqueue` does NOT cancel a different locale's running job, and supersedes only
  the same-locale job; `SyncTaskRunner` keeps one task per locale; (b) `latestTaskPerTargetLocale`
  reduction incl. the equal-`createdAt` tie-break; (c) `buildTranslationStatusRows` with N concurrent
  jobs shows N transient rows and a stable order; (d) `deriveDocumentRunStatus` priority.
- Manual: queue re-translate on 3 locales in a row → all three show running/pending; no row-swapping.

## Resilience / upgrade safety

A blast-radius review of the server changes found no data-loss, schema change, or migration: job
records are unchanged (`documentLocaleKey` and the Sync key are in-memory only), completed jobs
auto-delete (Payload's `deleteJobOnComplete` default) and superseded same-locale jobs are deleted on
re-enqueue, so retained rows are bounded by `docs × locales` (failed only). The `GET /document/...`
endpoint is internal (not re-exported from `src/index.ts`, no external caller). The one caveat —
deploy skew: a stale admin tab from before the object→array response change could feed a non-array to
the polling callback — is hardened with an `Array.isArray` normalizer in `useDocumentTranslation`
(self-healing regardless, but this avoids a transient throw mid-deploy).

## Open / follow-up

- **Collection-level panel** — checked and **not affected**. The collection popup
  (`useCollectionTranslationStatus`) is a bulk dashboard grouping documents by status; it has no
  per-locale status rows and no per-locale "Re-translate" action, so the concurrent-per-locale defect
  cannot occur there. No change needed.
- **Shared `queueApi.isPending` on re-translate buttons** (pre-existing, out of scope): all
  re-translate buttons share one mutation instance, so all show the loading state while any queue is in
  flight. Cosmetic, unrelated to this fix; left as-is.
