import type { Payload, Where, CollectionSlug } from "payload";

import type { TaskFilter, TaskRunner } from "../TaskRunner.interface";
import { toTaskFilter } from "../toTaskFilter";
import type { Task, TaskInput, RunResult } from "../types";
import type { PayloadJobsRunnerConfig, PayloadJob } from "./types";
import { normalizeJob, normalizeJobLocales } from "./normalizeJob";
import { planEnqueue } from "./planEnqueue";
import type { RequestShape } from "./planEnqueue";
import { readCollectionRef } from "./readCollectionRef";

type StoredWorkflowInput = {
  collection_slug: CollectionSlug;
  collection_id: string;
  source_lng: string;
  target_lngs: string[];
  strategy: string;
  publish_on_translation: boolean;
};

/** Ids are stringified here: the stored `collection_id` is text, so a number id must coerce to match. */
function requestShape(task: TaskInput): RequestShape {
  return {
    collectionSlug: task.collectionSlug,
    collectionId: String(task.collectionId),
    sourceLng: task.sourceLng,
    strategy: task.strategy,
    publishOnTranslation: task.publishOnTranslation,
  };
}

function requestKey(task: TaskInput): string {
  const r = requestShape(task);
  // NUL separates: no slug, id, locale or strategy can contain it, so no two different requests can
  // collide on one key.
  return [
    r.collectionSlug,
    r.collectionId,
    r.sourceLng,
    r.strategy,
    String(r.publishOnTranslation),
  ].join("\u0000");
}

function sameDocument(job: PayloadJob, request: RequestShape): boolean {
  const { collectionSlug, collectionId } = readCollectionRef(job.input);
  return collectionSlug === request.collectionSlug && collectionId === request.collectionId;
}

export class PayloadJobsTaskRunner implements TaskRunner {
  constructor(
    private readonly payload: Payload,
    private readonly config: PayloadJobsRunnerConfig
  ) {}

  async enqueue(tasks: TaskInput[]): Promise<void> {
    // Keyed by everything a job carries one of, not by document alone — see `pickHost`.
    const byRequest = new Map<string, TaskInput[]>();
    for (const task of tasks) {
      const key = requestKey(task);
      const group = byRequest.get(key) ?? [];
      group.push(task);
      byRequest.set(key, group);
    }

    // `findRawJobs` is unpaginated and filters in memory, so narrowing per document would re-read the
    // whole table once per document.
    const live = await this.findRawJobs({ completedAt: { exists: false } }, { pagination: false });
    const exclusiveQueue = Boolean(this.payload.config.jobs?.enableConcurrencyControl);

    // At most one group can match any live job — `pickHost` requires the same source locale, strategy
    // and publish flag — so no two of these writes touch the same row.
    await Promise.all(
      [...byRequest.values()].map((group) => this.serve(group, live, exclusiveQueue))
    );
  }

  private async serve(
    group: TaskInput[],
    live: PayloadJob[],
    exclusiveQueue: boolean
  ): Promise<void> {
    const [first] = group;
    const request = requestShape(first);
    const plan = planEnqueue({
      live: live.filter((job) => sameDocument(job, request)),
      request,
      requested: group.map((t) => t.targetLng),
      exclusiveQueue,
    });

    const undelivered = plan.host
      ? await this.extendJob(plan.host, plan.append, first.waitUntil)
      : [];
    const queue = [...plan.queue, ...undelivered];
    if (queue.length > 0) await this.queueWorkflow(request, queue, first.waitUntil);
  }

  /** @returns the locales that did not reach the job and need one of their own. */
  private async extendJob(job: PayloadJob, locales: string[], waitUntil?: Date): Promise<string[]> {
    let current: PayloadJob | undefined = job;
    // Two attempts: `input` is one JSON column, so a concurrent append replaces the whole list and
    // ours can be lost. Adding a locale is a set union, which makes retrying from the stored row
    // harmless. Anything still missing after that gets a job of its own rather than being dropped.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!current || current.completedAt) return locales;

      const listed = current.input?.target_lngs ?? [];
      const missing = locales.filter((locale) => !listed.includes(locale));
      // Keep the debounce: a job that has not started is still coalescing rapid source edits, and
      // this request is the latest of them. A running job's schedule is not ours to move.
      const debounce = waitUntil && !current.processing ? waitUntil.toISOString() : undefined;
      if (missing.length === 0 && !debounce) return [];

      const data: Record<string, unknown> = {
        input: { ...current.input, target_lngs: [...listed, ...missing] },
        ...(debounce ? { waitUntil: debounce } : {}),
      };

      // Adapter write, not `payload.update`: the document operation re-reads and rewrites the whole
      // row, reverting log entries written in between. Measured — see D2 of
      // docs/plans/2026-09-08-one-live-job-per-document.task.md.
      await this.payload.db.updateOne({
        collection: this.config.jobsCollection,
        id: job.id,
        data,
        returning: false,
      });

      [current] = await this.findRawJobs({ id: { equals: job.id } }, { limit: 1 });
      // Finished between the plan's read and this write: the locales are stored but nobody will run
      // them, so they need a job of their own.
      if (!current || current.completedAt) return locales;
      const stored = new Set(current.input?.target_lngs);
      if (locales.every((locale) => stored.has(locale))) return [];
    }
    const stored = new Set(current?.input?.target_lngs);
    return locales.filter((locale) => !stored.has(locale));
  }

  private async queueWorkflow(
    request: RequestShape,
    targetLngs: string[],
    waitUntil?: Date
  ): Promise<void> {
    const input: StoredWorkflowInput = {
      collection_slug: request.collectionSlug as CollectionSlug,
      collection_id: request.collectionId,
      source_lng: request.sourceLng,
      target_lngs: targetLngs,
      strategy: request.strategy,
      publish_on_translation: request.publishOnTranslation,
    };

    await this.payload.jobs.queue({
      workflow: this.config.workflowName as never,
      queue: this.config.queueName,
      waitUntil,
      input: input as never,
    });
  }

  async cancel(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;
    await this.cancelAndDeleteJobs(taskIds);
  }

  async run(taskId: string): Promise<RunResult> {
    const [job] = await this.findRawJobs({ id: { equals: taskId } }, { limit: 1 });
    if (!job) {
      return { success: false, error: "not_found" };
    }
    // The job's own state, not a locale row's: a locale row carries the log entry's `completedAt`,
    // which Payload stamps on failures too.
    const task = normalizeJob(job);
    if (task.completedAt) {
      return { success: false, error: "already_completed" };
    }
    if (task.status === "running" && !this.isStale(task.updatedAt)) {
      return { success: false, error: "already_running" };
    }
    if (task.status === "running" || task.status === "failed") {
      await this.clearPickerBlockers(taskId);
    }

    // `where` picker, not `payload.jobs.runByID({ id })`: in `runJobs` the guard block
    // (processing:false, hasError not true, waitUntil due) is built only for the non-id branch, so
    // the id path would re-run a job that already exhausted its retries. Checked against payload
    // 3.84.1.
    const result = (await this.payload.jobs.run({
      queue: this.config.queueName,
      where: { id: { equals: taskId } },
      limit: 1,
    })) as { jobStatus?: Record<string, unknown> };

    // An empty `jobStatus` is Payload reporting that the picker took nothing — usually a document
    // already running under the host's concurrency control.
    if (Object.keys(result?.jobStatus ?? {}).length === 0) {
      return { success: false, error: "already_running" };
    }
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
        this.ownJobs(),
        { processing: { equals: true } },
        { completedAt: { exists: false } },
        { updatedAt: { less_than: cutoff } },
      ],
    });
  }

  /**
   * Clears the processing lock, a spent retry budget and a pending backoff — the three things that
   * make the picker skip a job, so a manual run really is the retry.
   *
   * Goes through `payload.update` rather than the adapter, unlike `extendJob`, so the jobs
   * collection's own `beforeChange` hook still runs — it is what keeps a cancelled job cancelled.
   */
  private async clearPickerBlockers(taskId: string): Promise<void> {
    await this.payload.update({
      collection: this.config.jobsCollection,
      depth: 0,
      where: { id: { equals: taskId } },
      data: { processing: false, hasError: false, error: null, waitUntil: null },
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
   * Only `workflowSlug`/`taskSlug` and `completedAt` reach the database; the collection slug and
   * document ids are matched in memory
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
    const jobs = await this.findRawJobs(where, { pagination: false });
    const all = jobs.flatMap(normalizeJobLocales);
    const bySlug = all.filter((t) => t.input.collectionSlug === collectionSlug);
    if (!documentIds?.length) return bySlug;
    const wanted = new Set(documentIds.map(String));
    return bySlug.filter((t) => wanted.has(t.input.collectionId));
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

    // Narrowed to our own jobs: the ids arrive straight from the request body, and `payload-jobs` is
    // shared with whatever else the host queues there.
    await this.payload.delete({
      collection: this.config.jobsCollection,
      where: { and: [this.ownJobs(), { id: { in: taskIds } }] },
    });
  }

  private ownJobs(): Where {
    // Jobs queued before the workflow change are still in the table and carry the per-locale task slug.
    return {
      or: [
        { workflowSlug: { equals: this.config.workflowName } },
        { taskSlug: { equals: this.config.taskName } },
      ],
    };
  }

  private async findRawJobs(
    where?: Where,
    params?: { limit?: number; pagination?: boolean }
  ): Promise<PayloadJob[]> {
    const and: Where[] = [this.ownJobs()];
    if (where) and.push(where);

    const response = await this.payload.find({
      collection: this.config.jobsCollection,
      // The legacy `input.collection` is a declared relationship; at the default depth Payload
      // populates it, and `readCollectionRef` would then read a document where it wants an id.
      depth: 0,
      limit: params?.limit,
      pagination: params?.pagination,
      where: { and },
    });

    return response.docs as PayloadJob[];
  }
}
