import type { Payload, Where, CollectionSlug } from "payload";

import type { TaskFilter, TaskRunner } from "../TaskRunner.interface";
import { toTaskFilter } from "../toTaskFilter";
import type { Task, TaskInput, RunResult } from "../types";
import type { PayloadJobsRunnerConfig, PayloadJob, StoredWorkflowInput } from "./types";
import { normalizeJobLocales } from "./normalizeJob";
import { planEnqueue } from "./planEnqueue";
import type { RequestShape } from "./planEnqueue";
import { readCollectionRef } from "./readCollectionRef";
import type { RequestScope } from "../../../shared/payload/RequestScope.shapes";
import { freshReq } from "../../../shared/payload/RequestScope.shapes";

const APPEND_ATTEMPTS = 2;

/** Bounded by the database pool, not the CPU — a `select_all` enqueue can span thousands of groups. */
const ENQUEUE_CONCURRENCY = 10;

type QueueWorkflow = (args: {
  workflow: string;
  queue: string;
  waitUntil?: Date;
  input: StoredWorkflowInput;
  req?: { transactionID?: string | number };
}) => Promise<unknown>;

function requestShape(task: TaskInput, scope: RequestScope): RequestShape {
  return {
    collectionSlug: task.collectionSlug,
    collectionId: String(task.collectionId),
    sourceLng: task.sourceLng,
    strategy: task.strategy,
    publishOnTranslation: task.publishOnTranslation,
    requesterId: scope.userId ?? null,
    requesterCollection: scope.userCollection ?? null,
  };
}

/** `pickHost` matches on the same shape, so no two groups can pick the same host job — which is what
 * makes the parallel `serve` calls safe. */
function requestKey(task: TaskInput, scope: RequestScope): string {
  return JSON.stringify(requestShape(task, scope));
}

function documentKey(collectionSlug: string, collectionId: string): string {
  // NUL separator: no slug or id can contain it.
  return `${collectionSlug}\u0000${collectionId}`;
}

export class PayloadJobsTaskRunner implements TaskRunner {
  constructor(
    private readonly payload: Payload,
    private readonly config: PayloadJobsRunnerConfig
  ) {}

  async enqueue(tasks: TaskInput[], scope: RequestScope = {}): Promise<void> {
    const byRequest = new Map<string, TaskInput[]>();
    for (const task of tasks) {
      const key = requestKey(task, scope);
      const group = byRequest.get(key) ?? [];
      group.push(task);
      byRequest.set(key, group);
    }

    const live = await this.findRawJobs({ completedAt: { exists: false } }, scope);
    const liveByDocument = new Map<string, PayloadJob[]>();
    for (const job of live) {
      const { collectionSlug, collectionId } = readCollectionRef(job.input);
      const key = documentKey(collectionSlug, collectionId);
      liveByDocument.set(key, [...(liveByDocument.get(key) ?? []), job]);
    }
    const exclusiveQueue = Boolean(this.payload.config.jobs?.enableConcurrencyControl);

    const groups = [...byRequest.values()];
    for (let i = 0; i < groups.length; i += ENQUEUE_CONCURRENCY) {
      await Promise.all(
        groups
          .slice(i, i + ENQUEUE_CONCURRENCY)
          .map((group) => this.serve(group, liveByDocument, exclusiveQueue, scope))
      );
    }
  }

  private async serve(
    group: TaskInput[],
    liveByDocument: Map<string, PayloadJob[]>,
    exclusiveQueue: boolean,
    scope: RequestScope
  ): Promise<void> {
    const [first] = group;
    const request = requestShape(first, scope);
    const plan = planEnqueue({
      live: liveByDocument.get(documentKey(request.collectionSlug, request.collectionId)) ?? [],
      request,
      requested: group.map((t) => t.targetLng),
      exclusiveQueue,
    });

    const undelivered = plan.host
      ? await this.extendJob(plan.host, plan.append, first.waitUntil, scope)
      : [];
    const queue = [...plan.queue, ...undelivered];
    if (queue.length > 0) await this.queueWorkflow(request, queue, first.waitUntil, scope);
  }

  private async extendJob(
    job: PayloadJob,
    locales: string[],
    waitUntil: Date | undefined,
    scope: RequestScope
  ): Promise<string[]> {
    let current = job;
    let undelivered = locales;
    // `input` is one JSON column, so a concurrent append replaces the whole list; the union makes a
    // retry from the stored row harmless.
    for (let attempt = 0; attempt < APPEND_ATTEMPTS; attempt++) {
      const listed = current.input?.target_lngs ?? [];
      const missing = locales.filter((locale) => !listed.includes(locale));
      const debounce = waitUntil && !current.processing ? waitUntil.toISOString() : undefined;
      if (missing.length === 0 && !debounce) return [];

      // Not `payload.update`: it rewrites the whole row and reverts log entries written in between.
      // See D2 of docs/plans/2026-09-08-one-live-job-per-document.task.md.
      await this.payload.db.updateOne({
        req: freshReq(scope),
        collection: this.config.jobsCollection,
        id: job.id,
        data: {
          input: { ...current.input, target_lngs: [...listed, ...missing] },
          ...(debounce ? { waitUntil: debounce } : {}),
        },
        returning: false,
      });

      const reread = await this.findJobById(job.id, scope);
      if (!reread || reread.completedAt) return locales;
      current = reread;

      const stored = new Set(current.input?.target_lngs);
      undelivered = locales.filter((locale) => !stored.has(locale));
      if (undelivered.length === 0) return [];
    }
    return undelivered;
  }

  private async queueWorkflow(
    request: RequestShape,
    targetLngs: string[],
    waitUntil: Date | undefined,
    scope: RequestScope
  ): Promise<void> {
    const input: StoredWorkflowInput = {
      collection_slug: request.collectionSlug,
      collection_id: request.collectionId,
      source_lng: request.sourceLng,
      target_lngs: targetLngs,
      strategy: request.strategy,
      publish_on_translation: request.publishOnTranslation,
      requester_id: scope.userId ?? null,
      requester_collection: scope.userCollection ?? null,
    };

    // Cast: `jobs.queue` is typed over the host's generated slugs, which cannot include a workflow
    // registered at config time.
    const queueJob = this.payload.jobs.queue as unknown as QueueWorkflow;
    await queueJob({
      workflow: this.config.workflowName,
      queue: this.config.queueName,
      waitUntil,
      input,
      req: freshReq(scope),
    });
  }

  async cancel(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;

    // Mark then delete: the delete alone would drop the row from the status feed under
    // `deleteJobOnComplete: false` with no record of why, and the mark does not reach a running
    // handler — D1 of docs/plans/2026-09-08-one-live-job-per-document.task.md.
    // `ownJobs()` on both calls: a queue name is the host's to choose and may be shared, so an id
    // alone could reach somebody else's job.
    await this.payload.jobs.cancel({
      where: { and: [this.ownJobs(), { id: { in: taskIds } }] },
      queue: this.config.queueName,
    });

    await this.payload.delete({
      collection: this.config.jobsCollection,
      where: { and: [this.ownJobs(), { id: { in: taskIds } }] },
    });
  }

  async run(taskId: string): Promise<RunResult> {
    const job = await this.findJobById(taskId);
    if (!job) {
      return { success: false, error: "not_found" };
    }
    if (job.completedAt) {
      return { success: false, error: "already_completed" };
    }
    if (job.processing && !this.isStale(job.updatedAt)) {
      return { success: false, error: "already_running" };
    }
    await this.clearPickerBlockers(taskId);

    // Not `jobs.runByID`: the picker guard is built only on the `where` path — see
    // docs/plans/2026-09-04-job-scan-bounds.task.md.
    const result = await this.payload.jobs.run({
      queue: this.config.queueName,
      where: { id: { equals: taskId } },
      limit: 1,
    });

    const pickerTookNothing = Object.keys(result?.jobStatus ?? {}).length === 0;
    if (pickerTookNothing) {
      return { success: false, error: "already_running" };
    }
    return { success: true };
  }

  /**
   * A job that exhausted its retries carries `hasError: true` and stays excluded from the picker even
   * after its lock is cleared; only a manual `run()` recovers it.
   * @returns how many locks were cleared.
   */
  async reclaimStaleJobs(): Promise<number> {
    const cutoff = new Date(Date.now() - this.config.staleJobTimeoutMs).toISOString();
    const result = await this.payload.update({
      collection: this.config.jobsCollection,
      depth: 0,
      where: {
        and: [
          this.ownJobs(),
          { processing: { equals: true } },
          { completedAt: { exists: false } },
          { updatedAt: { less_than: cutoff } },
        ],
      },
      data: { processing: false },
    });
    return result.docs.length;
  }

  /**
   * `payload.update`, not the adapter write `extendJob` uses, so the jobs collection's `beforeChange`
   * hook still runs — it is what keeps a cancelled job cancelled.
   */
  private async clearPickerBlockers(taskId: string): Promise<void> {
    await this.payload.update({
      collection: this.config.jobsCollection,
      depth: 0,
      where: { id: { equals: taskId } },
      data: { processing: false, hasError: false, error: null, waitUntil: null },
    });
  }

  private isStale(updatedAt: string): boolean {
    const parsed = Date.parse(updatedAt);
    if (Number.isNaN(parsed)) return true;
    return Date.now() - parsed > this.config.staleJobTimeoutMs;
  }

  /**
   * Matched in memory: the collection reference has two stored shapes (see `readCollectionRef`), so a
   * `where` on `input.collection_slug` would silently drop every pre-migration job.
   */
  async findByCollection(
    collectionSlug: CollectionSlug,
    filter?: Array<string | number> | TaskFilter
  ): Promise<Task[]> {
    const { documentIds, excludeCompleted } = toTaskFilter(filter);
    const where = excludeCompleted ? { completedAt: { exists: false } } : undefined;
    const wanted = documentIds?.length ? new Set(documentIds.map(String)) : undefined;
    const jobs = await this.findRawJobs(where);
    return jobs
      .filter((job) => {
        const ref = readCollectionRef(job.input);
        return ref.collectionSlug === collectionSlug && (!wanted || wanted.has(ref.collectionId));
      })
      .flatMap(normalizeJobLocales);
  }

  private ownJobs(): Where {
    // Pre-workflow jobs are still in the table: docs/DEPRECATIONS.md#jobs-per-locale-task-shape
    return {
      or: [
        { workflowSlug: { equals: this.config.workflowName } },
        { taskSlug: { equals: this.config.taskName } },
      ],
    };
  }

  private async findJobById(id: string, scope: RequestScope = {}): Promise<PayloadJob | undefined> {
    const [job] = await this.findRawJobs({ id: { equals: id } }, scope);
    return job;
  }

  private async findRawJobs(where?: Where, scope: RequestScope = {}): Promise<PayloadJob[]> {
    const and: Where[] = [this.ownJobs()];
    if (where) and.push(where);

    const response = await this.payload.find({
      req: freshReq(scope),
      collection: this.config.jobsCollection,
      // The legacy `input.collection` is a declared relationship; at the default depth Payload
      // populates it, and `readCollectionRef` would then read a document where it wants an id.
      depth: 0,
      pagination: false,
      where: { and },
    });

    return response.docs as PayloadJob[];
  }
}
