import type { Payload, Where, CollectionSlug } from "payload";

import type { TaskFilter, TaskRunner } from "../TaskRunner.interface";
import { toTaskFilter } from "../toTaskFilter";
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
      // Finished jobs must stay out of this set: superseding deletes (`cancelAndDeleteJobs` reaches
      // `payload.delete`), so a completed job for the same (document, locale) would be erased along
      // with the pending one.
      const existing = await this.findByCollection(collectionSlug, {
        documentIds,
        excludeCompleted: true,
      });
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
        await this.cancelAndDeleteJobs(toCancel.map((t) => t.id));
      }
    }

    await Promise.all(
      tasks.map((task) =>
        this.payload.jobs.queue({
          task: this.config.taskName,
          queue: this.config.queueName,
          // Debounce: when set, Payload holds the job until this instant. A superseding enqueue for
          // the same (document, targetLng) cancels the pending delayed job first (see enqueue above),
          // so rapid source edits coalesce to the final one. Undefined for the manual path.
          waitUntil: task.waitUntil,
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
