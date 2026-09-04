import type { Payload, Where, CollectionSlug } from "payload";

import type { TaskFilter, TaskRunner } from "../TaskRunner.interface";
import { toTaskFilter } from "../toTaskFilter";
import type { Task, TaskInput, RunResult } from "../types";
import type { PayloadJobsRunnerConfig, PayloadJob } from "./types";
import { normalizeJobLocales } from "./normalizeJob";

/** {@link TaskRunner} backed by Payload's job queue (`payload-jobs`). */
export class PayloadJobsTaskRunner implements TaskRunner {
  constructor(
    private readonly payload: Payload,
    private readonly config: PayloadJobsRunnerConfig
  ) {}

  async enqueue(tasks: TaskInput[]): Promise<void> {
    // One workflow per document, carrying its locales, rather than one job per locale. Payload runs a
    // batch of jobs through `Promise.all`, and every write it makes is a whole-document version
    // snapshot — so two locales translated in parallel build their snapshots from the same base and
    // the second silently drops the first's work. Measured at one translation of two landing, on all
    // three adapters. See issue #114.
    const byDocument = new Map<string, TaskInput[]>();
    for (const task of tasks) {
      const key = `${task.collectionSlug}:${task.collectionId}`;
      byDocument.set(key, [...(byDocument.get(key) ?? []), task]);
    }

    for (const group of byDocument.values()) {
      const [first] = group;
      const existing = await this.findByCollection(first.collectionSlug, {
        documentIds: [first.collectionId],
        excludeCompleted: true,
      });
      // Only work that has not begun. A workflow already running keeps the locales it has finished
      // and completes; the new request queues behind it. Cancelling it would discard translations
      // that already landed — the very loss this change exists to stop.
      const toCancel = existing.filter(
        (t) => t.input.collectionId === String(first.collectionId) && t.status === "pending"
      );
      if (toCancel.length > 0) {
        await this.cancelAndDeleteJobs(toCancel.map((t) => t.id));
      }

      await this.payload.jobs.queue({
        workflow: this.config.workflowName as never,
        queue: this.config.queueName,
        // Debounce: Payload holds the job until this instant, so rapid source edits coalesce.
        waitUntil: first.waitUntil,
        input: {
          collection_slug: first.collectionSlug,
          // The one place an id is normalized for storage; the stored shape is text so a job stays
          // ID-agnostic. See docs/DEPRECATIONS.md#jobs-input-collection-field
          collection_id: String(first.collectionId),
          source_lng: first.sourceLng,
          target_lngs: group.map((t) => t.targetLng),
          strategy: first.strategy,
          publish_on_translation: first.publishOnTranslation,
        } as never,
      });
    }
  }

  async cancel(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;
    await this.cancelAndDeleteJobs(taskIds);
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
      // The picker below selects only `processing: false`, so a stale lock must be cleared first.
      if (!this.isStale(task.updatedAt)) {
        return { success: false, error: "already_running" };
      }
      await this.resetProcessing({ id: { equals: taskId } });
    }

    // `where` picker, not `payload.jobs.runByID({ id })`: in `runJobs` the guard block
    // (processing:false, hasError not true, waitUntil due) is built only for the non-id branch, so
    // the id path would re-run a job that already exhausted its retries. Checked against payload
    // 3.84.1.
    await this.payload.jobs.run({
      queue: this.config.queueName,
      where: { id: { equals: taskId } },
      limit: 1,
    });
    return { success: true };
  }

  /**
   * Clear stale `processing` locks — still processing, not completed, `updatedAt` older than
   * `staleJobTimeoutMs` — so abandoned jobs are eligible for the autorun picker again. A job that
   * exhausted its retries carries `hasError: true` and stays excluded from autorun even after its
   * lock is cleared; only a manual `run()` recovers it.
   * @returns how many locks were cleared.
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

  /** Clears the `processing` lock on every job matching `where`. `depth: 0` — only the count is read. */
  private async resetProcessing(where: Where): Promise<number> {
    const result = await this.payload.update({
      collection: this.config.jobsCollection,
      depth: 0,
      where,
      data: { processing: false },
    });
    return result.docs.length;
  }

  private isStale(updatedAt: string): boolean {
    const parsed = Date.parse(updatedAt);
    // Unknown/corrupt timestamp → treat as stale so the job can be recovered
    // rather than permanently refused as already-running.
    if (Number.isNaN(parsed)) return true;
    return Date.now() - parsed > this.config.staleJobTimeoutMs;
  }

  /**
   * Find translation jobs for a collection.
   *
   * Only `taskSlug` and `completedAt` reach the database; slug and document ids are matched in memory
   * because a job's collection reference may sit in either the flat-text fields or the legacy
   * relationship shape (`readCollectionRef`), so a `where` on `input.collection_slug` would silently
   * drop every pre-migration job. `excludeCompleted` is what bounds the read — see issue #108.
   */
  async findByCollection(
    collectionSlug: CollectionSlug,
    filter?: Array<string | number> | TaskFilter
  ): Promise<Task[]> {
    const { documentIds, excludeCompleted } = toTaskFilter(filter);
    const where = excludeCompleted ? { completedAt: { exists: false } } : undefined;
    const all = await this.findJobsInternal(where, { pagination: false });
    const bySlug = all.filter((t) => t.input.collectionSlug === collectionSlug);
    if (!documentIds?.length) return bySlug;
    const wanted = new Set(documentIds.map(String));
    return bySlug.filter((t) => wanted.has(t.input.collectionId));
  }

  private groupByCollection(tasks: TaskInput[]): Map<CollectionSlug, TaskInput[]> {
    const map = new Map<CollectionSlug, TaskInput[]>();
    for (const task of tasks) {
      const existing = map.get(task.collectionSlug) ?? [];
      existing.push(task);
      map.set(task.collectionSlug, existing);
    }
    return map;
  }

  private async cancelAndDeleteJobs(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;

    // Both, in this order: `jobs.cancel` only writes `{ error: { cancelled: true }, hasError: true,
    // processing: false }`, which is what signals a running handler to abort. The delete then removes
    // the row — under `deleteJobOnComplete: false` a cancelled job would otherwise sit in the status
    // feed forever.
    await this.payload.jobs.cancel({
      where: { id: { in: taskIds } },
      queue: this.config.queueName,
    });

    await this.payload.delete({
      collection: this.config.jobsCollection,
      where: { id: { in: taskIds } },
    });
  }

  private async findJobsInternal(
    where?: Where,
    params?: { limit?: number; pagination?: boolean }
  ): Promise<Task[]> {
    // Both shapes: a document's work is a workflow now, but jobs queued before that change — and
    // still sitting in the table — carry the per-locale task slug. Same expand/contract as
    // `readCollectionRef` does for the collection reference.
    const and: Where[] = [
      {
        or: [
          { workflowSlug: { equals: this.config.workflowName } },
          { taskSlug: { equals: this.config.taskName } },
        ],
      },
    ];
    if (where) and.push(where);

    const response = await this.payload.find({
      collection: this.config.jobsCollection,
      limit: params?.limit,
      pagination: params?.pagination,
      where: { and },
    });

    return (response.docs as PayloadJob[]).flatMap(normalizeJobLocales);
  }
}
