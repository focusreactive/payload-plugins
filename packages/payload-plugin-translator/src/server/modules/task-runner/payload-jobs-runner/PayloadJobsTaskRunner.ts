import type { Payload, Where, CollectionSlug } from "payload";

import type { TaskFilter, TaskRunner } from "../TaskRunner.interface.js";
import type { TaskRunnerContext } from "../TaskRunnerProvider.interface.js";
import { toTaskFilter } from "../toTaskFilter.js";
import type { EnqueueAssignment, Task, TaskInput, RunResult } from "../types.js";
import type { PayloadJobsRunnerConfig } from "./config.js";
import type { PayloadJob, StoredWorkflowInput } from "./store/index.js";
import { assignmentOf, handleOf, normalizeJobLocales, readCollectionRef } from "./store/index.js";
import { owedOnCancel, planEnqueue } from "./model/index.js";
import type { RequestShape } from "./model/index.js";
import type { RequestScope } from "../../../shared/payload/RequestScope.shapes.js";
import { freshReq } from "../../../shared/payload/RequestScope.shapes.js";

const APPEND_ATTEMPTS = 2;
const ENQUEUE_CONCURRENCY = 10;

type QueueWorkflow = (args: {
  workflow: string;
  queue: string;
  waitUntil?: Date;
  input: StoredWorkflowInput;
  req?: { transactionID?: string | number };
}) => Promise<{ id?: unknown } | undefined>;

const assign = (request: RequestShape, targetLngs: string[], handle: string): EnqueueAssignment[] =>
  targetLngs.map((targetLng) => ({
    collectionSlug: request.collectionSlug as CollectionSlug,
    collectionId: request.collectionId,
    sourceLng: request.sourceLng,
    targetLng,
    strategy: request.strategy,
    handle,
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
  private readonly payload: Payload;
  private readonly config: PayloadJobsRunnerConfig;
  private readonly context: TaskRunnerContext;

  constructor(payload: Payload, config: PayloadJobsRunnerConfig, context: TaskRunnerContext) {
    this.payload = payload;
    this.config = config;
    this.context = context;
  }

  async enqueue(tasks: TaskInput[], scope: RequestScope = {}): Promise<EnqueueAssignment[]> {
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
    const assigned: EnqueueAssignment[] = [];
    for (let i = 0; i < groups.length; i += ENQUEUE_CONCURRENCY) {
      const served = await Promise.all(
        groups
          .slice(i, i + ENQUEUE_CONCURRENCY)
          .map((group) => this.serve(group, liveByDocument, exclusiveQueue, scope))
      );
      for (const entries of served) assigned.push(...entries);
    }
    for (const assignment of assigned) {
      await this.context.report(this.payload, assignment, { state: "queued" });
    }
    return assigned;
  }

  private async serve(
    group: TaskInput[],
    liveByDocument: Map<string, PayloadJob[]>,
    exclusiveQueue: boolean,
    scope: RequestScope
  ): Promise<EnqueueAssignment[]> {
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
    const delivered = plan.append.filter((locale) => !undelivered.includes(locale));

    const onTheHost = plan.host ? assign(request, delivered, String(plan.host.id)) : [];
    const onTheCovering = plan.coveredBy
      ? assign(request, plan.covered, String(plan.coveredBy.id))
      : [];
    if (queue.length === 0) return [...onTheHost, ...onTheCovering];

    const handle = await this.queueWorkflow(request, queue, first.waitUntil, scope);
    return handle === null
      ? [...onTheHost, ...onTheCovering]
      : [...onTheHost, ...onTheCovering, ...assign(request, queue, handle)];
  }

  private async extendJob(
    job: PayloadJob,
    locales: string[],
    waitUntil: Date | undefined,
    scope: RequestScope
  ): Promise<string[]> {
    let current = job;
    let undelivered = locales;
    for (let attempt = 0; attempt < APPEND_ATTEMPTS; attempt++) {
      const listed = current.input?.target_lngs ?? [];
      const missing = locales.filter((locale) => !listed.includes(locale));
      const debounce = waitUntil && !current.processing ? waitUntil.toISOString() : undefined;
      if (missing.length === 0 && !debounce) return [];

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
    return handleOf(
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

    for (const job of await this.findRawJobs({ id: { in: taskIds } })) {
      for (const task of owedOnCancel(job)) {
        const assignment = assignmentOf(job, task.input.targetLng);
        if (assignment) {
          await this.context.report(this.payload, assignment, { state: "cancelled" });
        }
      }
    }

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
