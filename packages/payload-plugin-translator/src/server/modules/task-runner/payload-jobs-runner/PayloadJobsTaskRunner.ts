import type { Payload, Where, CollectionSlug } from "payload";

import type { TaskRunner } from "../TaskRunner.interface";
import type { Task, TaskInput, RunResult, ID } from "../types";
import type { PayloadJobsRunnerConfig, PayloadJob } from "./types";
import { normalizeJob } from "./normalizeJob";

// A translation job's supersession identity: same document AND same target locale. IDs are
// String()-normalized to match the stored (string) form, so a number id compares equal to its
// persisted job.
const documentLocaleKey = (collectionId: ID, targetLng: string): string =>
  `${String(collectionId)}:${targetLng}`;

/**
 * TaskRunner implementation using Payload Jobs.
 *
 * Handles queuing, cancellation, status tracking, and execution of translation tasks.
 */
export class PayloadJobsTaskRunner implements TaskRunner {
  constructor(
    private readonly payload: Payload,
    private readonly config: PayloadJobsRunnerConfig
  ) {}

  async enqueue(tasks: TaskInput[]): Promise<void> {
    const byCollection = this.groupByCollection(tasks);

    for (const [collectionSlug, items] of byCollection) {
      const documentIds = items.map((t) => t.collectionId);
      const existing = await this.findByCollection(collectionSlug, documentIds);
      // Supersede only jobs for the SAME (document, target locale) being re-enqueued — never a
      // concurrent job for a *different* locale of the same document. Cancelling per-document would
      // kill an in-flight translation of another locale (the concurrent re-translate bug).
      const supersededKeys = new Set(
        items.map((t) => documentLocaleKey(t.collectionId, t.targetLng))
      );
      const toCancel = existing.filter((t) =>
        supersededKeys.has(documentLocaleKey(t.input.collectionId, t.input.targetLng))
      );
      if (toCancel.length > 0) {
        await this.cancelInternal(toCancel.map((t) => t.id));
      }
    }

    await Promise.all(
      tasks.map((task) =>
        this.payload.jobs.queue({
          task: this.config.taskName,
          queue: this.config.queueName,
          input: {
            // Flat text reference (ID-agnostic). Stored as a string — no
            // relationship type validation against the collection's ID type,
            // which is what previously left number-id jobs stuck in processing.
            // This is the single write boundary, so `String(...)` here is the
            // one place IDs are normalized for storage.
            collection_slug: task.collectionSlug,
            collection_id: String(task.collectionId),
            source_lng: task.sourceLng,
            target_lng: task.targetLng,
            strategy: task.strategy,
            publish_on_translation: task.publishOnTranslation,
          },
        })
      )
    );
  }

  async cancel(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;
    await this.cancelInternal(taskIds);
  }

  async run(taskId: string): Promise<RunResult> {
    const tasks = await this.findJobsInternal({ id: { equals: taskId } }, { limit: 1 });
    const task = tasks[0];

    if (!task) {
      return { success: false, error: "not_found" };
    }
    if (task.completedAt) {
      return { success: false, error: "already_completed" };
    }
    if (task.status === "running") {
      // A genuinely in-flight job is refused. A stale processing lock (left by
      // a process killed mid-run) is reclaimable: clear it first so the queue
      // picker below — which only selects `processing: false` — can re-run it.
      if (!this.isStale(task.updatedAt)) {
        return { success: false, error: "already_running" };
      }
      await this.resetProcessing({ id: { equals: taskId } });
    }

    // Execute synchronously via the queue + `where` picker so the job runs to
    // completion within this request (nothing is abandoned after the HTTP
    // response — reliable on serverless too).
    //
    // NOT `payload.jobs.runByID({ id })`: on the drizzle adapter the id-path
    // (`db.updateJobs({ id })`) writes `processing: true` but returns no rows,
    // so `runJobs` reports `noJobsRemaining` and the handler never runs —
    // leaving the job stuck at `processing: true` forever. The `where`-based
    // picker selects, runs, and finalizes the job correctly (verified against
    // sqlite). The picker also enforces processing:false / no-error / no
    // pending waitUntil, so a failed (max-retries) job is not re-run here.
    await this.payload.jobs.run({
      queue: this.config.queueName,
      where: { id: { equals: taskId } },
      limit: 1,
    });
    return { success: true };
  }

  /**
   * Reset stale processing locks so abandoned jobs become eligible for the
   * autorun picker again. The picker requires processing:false, no error, and
   * no pending waitUntil; a job abandoned mid-run (no error, no waitUntil)
   * satisfies the rest, so clearing processing is sufficient for that case.
   * A job that already exhausted retries (hasError:true) stays excluded from
   * autorun and is only recoverable via a manual run().
   *
   * A job is stale when it is still `processing: true`, not yet completed, and
   * its `updatedAt` is older than `staleJobTimeoutMs` — i.e. a process was
   * killed mid-run (deploy/crash/timeout). Threshold-based, so a job genuinely
   * in flight on another live instance (fresh `updatedAt`) is left alone.
   * Filters on real `payload-jobs` columns only (no JSON-path traversal), so
   * the drizzle SQLite issue in `findByCollection` does not apply here.
   * @returns the number of jobs reclaimed.
   */
  async reclaimStaleJobs(): Promise<number> {
    const cutoff = new Date(Date.now() - this.config.staleJobTimeoutMs).toISOString();
    return this.resetProcessing({
      and: [
        { taskSlug: { equals: this.config.taskName } },
        { processing: { equals: true } },
        { completedAt: { exists: false } },
        { updatedAt: { less_than: cutoff } },
      ],
    });
  }

  /**
   * Clear the `processing` lock on every job matching `where`, returning how
   * many were reset. Shared by the per-job reset in `run()` (a stale lock) and
   * the bulk boot/recovery reset in `reclaimStaleJobs()`. `depth: 0` because
   * only the count is needed — no relationships to populate.
   */
  private async resetProcessing(where: Where): Promise<number> {
    const result = await this.payload.update({
      collection: this.config.jobsCollection,
      depth: 0,
      where,
      data: { processing: false },
    });
    return result.docs.length;
  }

  /**
   * A processing lock is stale once `updatedAt` is older than the configured
   * timeout — the owning run is presumed dead.
   */
  private isStale(updatedAt: string): boolean {
    const parsed = Date.parse(updatedAt);
    // Unknown/corrupt timestamp → treat as stale so the job can be recovered
    // rather than permanently refused as already-running.
    if (Number.isNaN(parsed)) return true;
    return Date.now() - parsed > this.config.staleJobTimeoutMs;
  }

  /**
   * Find translation jobs for a collection, optionally narrowed by document IDs.
   *
   * Narrowing is by `taskSlug` only in SQL; the collection slug and document
   * IDs are matched in memory (via the normalized `Task`, which reads both the
   * current flat-text shape and the legacy relationship shape). This is the
   * one path that must transparently span both stored shapes during the
   * ID-agnostic migration — see docs/DEPRECATIONS.md#jobs-input-collection-field.
   *
   * IMPORTANT — why slug/id are matched in memory, not in the SQL WHERE
   * ------------------------------------------------------------------------
   * The "natural" implementation would push `input.collection_id` into the
   * where clause. This DOES NOT work on SQLite (and is unreliable on any
   * adapter) because of two compounding bugs in Payload's drizzle layer.
   *
   * 1. The `input` field on `payload-jobs` is declared `type: 'json'`. The
   *    drizzle path resolver (`@payloadcms/drizzle/queries/getTableColumnFromPath`)
   *    has no `case 'json'` branch, so the value is left as a raw column and
   *    the path segments are passed through to `parseParams.js`, which on
   *    SQLite builds raw SQL using `convertPathToJSONTraversal` — generating
   *    expressions like `input->>'collection_id'`.
   *
   * 2. When `parseParams.js` formats the right-hand side of `in`/`not_in`
   *    (and even `equals` when `!isNaN(val)`), it inlines values via JS
   *    template literals WITHOUT wrapping strings in quotes. The string
   *    `'1'` from our WHERE becomes raw `1` in the SQL. Drizzle therefore
   *    emits queries like `WHERE input->>'collection_id' IN (1)` even though
   *    the caller passed `['1']` (an array of strings).
   *
   * On SQLite, `->>` preserves the JSON value's type and `IN (...)` does NOT
   * coerce between TEXT and INTEGER, so a numeric-looking string id never
   * matches once bug #2 strips its quotes. Storing the id as text (this
   * migration) does not fix the SQL path — drizzle re-numbers it anyway — so
   * we keep matching in memory.
   *
   * Why in-memory filtering is acceptable here
   * ------------------------------------------
   * Per-task job sets are small (typically <100 rows; the plugin actively
   * cancels superseded jobs so they don't accumulate), so the JS filtering
   * is effectively free. If/when the upstream drizzle bug is fixed, this can
   * collapse back to a single SQL query.
   */
  async findByCollection(
    collectionSlug: CollectionSlug,
    documentIds?: Array<string | number>
  ): Promise<Task[]> {
    const all = await this.findJobsInternal(undefined, { pagination: false });
    const bySlug = all.filter((t) => t.input.collectionSlug === collectionSlug);
    if (!documentIds?.length) return bySlug;
    // `documentIds` is the public `Array<string | number>` param, so normalize
    // it here; `t.input.collectionId` is already `ID` (string) via normalizeJob.
    const wanted = new Set(documentIds.map(String));
    return bySlug.filter((t) => wanted.has(t.input.collectionId));
  }

  /**
   * Group tasks by collection slug
   */
  private groupByCollection(tasks: TaskInput[]): Map<CollectionSlug, TaskInput[]> {
    const map = new Map<CollectionSlug, TaskInput[]>();
    for (const task of tasks) {
      const existing = map.get(task.collectionSlug) ?? [];
      existing.push(task);
      map.set(task.collectionSlug, existing);
    }
    return map;
  }

  /**
   * Internal cancel implementation
   */
  private async cancelInternal(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;

    await this.payload.jobs.cancel({
      where: { id: { in: taskIds } },
      queue: this.config.queueName,
    });

    await this.payload.delete({
      collection: this.config.jobsCollection,
      where: { id: { in: taskIds } },
    });
  }

  /**
   * Internal method to find jobs with where clause
   */
  private async findJobsInternal(
    where?: Where,
    params?: { limit?: number; pagination?: boolean }
  ): Promise<Task[]> {
    const and: Where[] = [{ taskSlug: { equals: this.config.taskName } }];
    if (where) and.push(where);

    const response = await this.payload.find({
      collection: this.config.jobsCollection,
      limit: params?.limit,
      pagination: params?.pagination,
      where: { and },
    });

    return (response.docs as PayloadJob[]).map(normalizeJob);
  }
}
