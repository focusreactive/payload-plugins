import type { Payload, Where, CollectionSlug } from "payload";

import type { EnqueueResult, TaskFilter, TaskRunner } from "../TaskRunner.interface.js";
import { toTaskFilter } from "../toTaskFilter.js";
import type { Task, TaskInput, RunResult } from "../types.js";
import type { PayloadJobsRunnerConfig, PayloadJob, StoredWorkflowInput } from "./types.js";
import { canStillRun, normalizeJobLocales } from "./normalizeJob.js";
import { planEnqueue } from "./planEnqueue.js";
import type { RequestShape } from "./planEnqueue.js";
import { readCollectionRef } from "./readCollectionRef.js";
import type { RequestScope } from "../../../shared/payload/RequestScope.shapes.js";
import { freshReq } from "../../../shared/payload/RequestScope.shapes.js";

const APPEND_ATTEMPTS = 2;
const ENQUEUE_CONCURRENCY = 10;

/**
 * `hostGone`: the row stopped being runnable while we were writing to it — finished, gave up, was
 * cancelled or vanished — so none of the request's locales may be claimed for it.
 */
type Extension = { undelivered: string[]; hostGone: boolean };

const NO_EXTENSION: Extension = { undelivered: [], hostGone: false };

type QueueWorkflow = (args: {
  workflow: string;
  queue: string;
  waitUntil?: Date;
  input: StoredWorkflowInput;
  req?: { transactionID?: string | number };
}) => Promise<{ id?: unknown } | undefined>;

const jobIdOf = (queued: { id?: unknown } | undefined): string | null =>
  typeof queued?.id === "string" || typeof queued?.id === "number" ? String(queued.id) : null;

const claim = (request: RequestShape, targetLngs: string[], jobId: string): EnqueueResult =>
  targetLngs.map((targetLng) => ({
    collectionSlug: request.collectionSlug as CollectionSlug,
    collectionId: request.collectionId,
    targetLng,
    jobId,
  }));

function requestShape(task: TaskInput, scope: RequestScope): RequestShape {
  return {
    collectionSlug: task.collectionSlug,
    collectionId: String(task.collectionId),
    sourceLng: task.sourceLng,
    strategy: task.strategy,
    publishOnTranslation: task.publishOnTranslation,
    requesterId: scope.requester?.userId ?? null,
    requesterCollection: scope.requester?.userCollection ?? null,
  };
}

function requestKey(task: TaskInput, scope: RequestScope): string {
  return JSON.stringify(requestShape(task, scope));
}

function documentKey(collectionSlug: string, collectionId: string): string {
  return `${collectionSlug}\u0000${collectionId}`;
}

export class PayloadJobsTaskRunner implements TaskRunner {
  constructor(
    private readonly payload: Payload,
    private readonly config: PayloadJobsRunnerConfig
  ) {}

  async enqueue(tasks: TaskInput[], scope: RequestScope = {}): Promise<EnqueueResult> {
    const byRequest = new Map<string, TaskInput[]>();
    for (const task of tasks) {
      const key = requestKey(task, scope);
      const group = byRequest.get(key) ?? [];
      group.push(task);
      byRequest.set(key, group);
    }

    const live = await this.findRawJobs(
      { and: [{ completedAt: { exists: false } }, { hasError: { not_equals: true } }] },
      scope
    );
    const liveByDocument = new Map<string, PayloadJob[]>();
    for (const job of live) {
      const { collectionSlug, collectionId } = readCollectionRef(job.input);
      const key = documentKey(collectionSlug, collectionId);
      liveByDocument.set(key, [...(liveByDocument.get(key) ?? []), job]);
    }
    const exclusiveQueue = Boolean(this.payload.config.jobs?.enableConcurrencyControl);

    const groups = [...byRequest.values()];
    const claimed: EnqueueResult = [];
    for (let i = 0; i < groups.length; i += ENQUEUE_CONCURRENCY) {
      const served = await Promise.all(
        groups
          .slice(i, i + ENQUEUE_CONCURRENCY)
          .map((group) => this.serve(group, liveByDocument, exclusiveQueue, scope))
      );
      for (const entries of served) claimed.push(...entries);
    }
    return claimed;
  }

  private async serve(
    group: TaskInput[],
    liveByDocument: Map<string, PayloadJob[]>,
    exclusiveQueue: boolean,
    scope: RequestScope
  ): Promise<EnqueueResult> {
    const [first] = group;
    const request = requestShape(first, scope);
    const plan = planEnqueue({
      live: liveByDocument.get(documentKey(request.collectionSlug, request.collectionId)) ?? [],
      request,
      requested: group.map((t) => t.targetLng),
      exclusiveQueue,
    });

    const extension =
      plan.host && plan.extend
        ? await this.extendJob(plan.host, plan.append, first.waitUntil, scope)
        : NO_EXTENSION;
    const requested = [...new Set(group.map((task) => task.targetLng))];
    // Host gone: nothing of the plan survives it, so every requested locale is queued afresh —
    // including any the dead host had already translated.
    const queue = extension.hostGone ? requested : [...plan.queue, ...extension.undelivered];
    const goingToANewJob = new Set(queue);
    const alreadyOnHost = requested.filter((locale) => !goingToANewJob.has(locale));
    const claimedFromHost =
      plan.host && !extension.hostGone ? claim(request, alreadyOnHost, String(plan.host.id)) : [];

    if (queue.length === 0) return claimedFromHost;

    const queuedId = await this.queueWorkflow(request, queue, first.waitUntil, scope);
    return queuedId === null
      ? claimedFromHost
      : [...claimedFromHost, ...claim(request, queue, queuedId)];
  }

  private async extendJob(
    job: PayloadJob,
    locales: string[],
    waitUntil: Date | undefined,
    scope: RequestScope
  ): Promise<Extension> {
    let current = job;
    let undelivered = locales;
    for (let attempt = 0; attempt < APPEND_ATTEMPTS; attempt++) {
      const listed = current.input?.target_lngs ?? [];
      const missing = locales.filter((locale) => !listed.includes(locale));
      const debounce = waitUntil && !current.processing ? waitUntil.toISOString() : undefined;
      if (missing.length === 0 && !debounce) return NO_EXTENSION;

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

      const reread = await this.findJobById(String(job.id), scope);
      if (!reread || !canStillRun(reread)) return { undelivered: [], hostGone: true };
      current = reread;

      const stored = new Set(current.input?.target_lngs);
      undelivered = locales.filter((locale) => !stored.has(locale));
      if (undelivered.length === 0) return NO_EXTENSION;
    }
    return { undelivered, hostGone: false };
  }

  private async queueWorkflow(
    request: RequestShape,
    targetLngs: string[],
    waitUntil: Date | undefined,
    scope: RequestScope
  ): Promise<string | null> {
    const input: StoredWorkflowInput = {
      collection_slug: request.collectionSlug,
      collection_id: request.collectionId,
      source_lng: request.sourceLng,
      target_lngs: targetLngs,
      strategy: request.strategy,
      publish_on_translation: request.publishOnTranslation,
      requester_id: scope.requester?.userId ?? null,
      requester_collection: scope.requester?.userCollection ?? null,
    };

    const queueJob = this.payload.jobs.queue as unknown as QueueWorkflow;
    return jobIdOf(
      await queueJob({
        workflow: this.config.workflowName,
        queue: this.config.queueName,
        waitUntil,
        input,
        req: freshReq(scope),
      })
    );
  }

  async cancel(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;

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

  async findByIds(taskIds: string[]): Promise<Task[]> {
    if (taskIds.length === 0) return [];
    const jobs = await this.findRawJobs({ id: { in: taskIds } });
    return jobs.flatMap(normalizeJobLocales);
  }

  private ownJobs(): Where {
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
      depth: 0,
      pagination: false,
      where: { and },
    });

    return response.docs as PayloadJob[];
  }
}
