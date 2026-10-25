import type { Payload, Where, CollectionSlug } from "payload";

import type { TaskFilter, TaskRunner } from "../TaskRunner.interface.js";
import type { TaskRunnerContext } from "../TaskRunnerProvider.interface.js";
import { toTaskFilter } from "../toTaskFilter.js";
import type { EnqueueAssignment, JobAssignment, Task, TaskInput, RunResult } from "../types.js";
import type { PayloadJobsRunnerConfig } from "./config.js";
import type { PayloadJob, StoredRunTarget, StoredWorkflowInput } from "./store/index.js";
import { runLocales, runTargets } from "./store/index.js";
import {
  assignmentOf,
  handleOf,
  normalizeJobLocales,
  ofCollection,
  ofDocuments,
  readCollectionRef,
  readRequester,
} from "./store/index.js";
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
    handle,
  }));

function requestShape(task: TaskInput, scope: RequestScope): RequestShape {
  return {
    collectionSlug: task.collectionSlug,
    collectionId: String(task.collectionId),
    sourceLng: task.sourceLng,
    publishOnTranslation: task.publishOnTranslation,
    requesterId: scope.requester?.userId ?? null,
    requesterCollection: scope.requester?.userCollection ?? null,
  };
}

function requestKey(task: TaskInput, scope: RequestScope): string {
  return JSON.stringify(requestShape(task, scope));
}

const settledSince = (moment: Date): Where => ({
  or: [{ hasError: { not_equals: true } }, { updatedAt: { greater_than: moment.toISOString() } }],
});

function documentKey(collectionSlug: string, collectionId: string): string {
  return `${collectionSlug}\u0000${collectionId}`;
}

function storedTargets(group: TaskInput[], locales: string[]): StoredRunTarget[] {
  const asked = new Map(group.map((task) => [task.targetLng, task]));
  return locales.map((lng) => ({ lng, filters: [...(asked.get(lng)?.filters ?? [])] }));
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
      requested: storedTargets(
        group,
        group.map((t) => t.targetLng)
      ),
      exclusiveQueue,
    });

    const undelivered = plan.host
      ? await this.extendJob(plan.host, storedTargets(group, plan.append), first.waitUntil, scope)
      : [];
    const queue = [...plan.queue, ...undelivered];
    const delivered = plan.append.filter((locale) => !undelivered.includes(locale));

    const onTheHost = plan.host ? assign(request, delivered, String(plan.host.id)) : [];
    const onTheCovering = plan.coveredBy
      ? assign(request, plan.covered, String(plan.coveredBy.id))
      : [];
    if (queue.length === 0) return [...onTheHost, ...onTheCovering];

    const handle = await this.queueWorkflow(
      request,
      storedTargets(group, queue),
      first.waitUntil,
      scope
    );
    return handle === null
      ? [...onTheHost, ...onTheCovering]
      : [...onTheHost, ...onTheCovering, ...assign(request, queue, handle)];
  }

  private async extendJob(
    job: PayloadJob,
    appending: StoredRunTarget[],
    waitUntil: Date | undefined,
    scope: RequestScope
  ): Promise<string[]> {
    const locales = appending.map((target) => target.lng);
    let current = job;
    let undelivered = locales;
    for (let attempt = 0; attempt < APPEND_ATTEMPTS; attempt++) {
      const listed = runTargets(current.input);
      const already = new Set(listed.map((target) => target.lng));
      const missing = appending.filter((target) => !already.has(target.lng));
      const debounce = waitUntil && !current.processing ? waitUntil.toISOString() : undefined;
      if (missing.length === 0 && !debounce) return [];

      await this.payload.db.updateOne({
        req: freshReq(scope),
        collection: this.config.jobsCollection,
        id: job.id,
        data: {
          input: { ...current.input, targets: [...listed, ...missing] },
          ...(debounce ? { waitUntil: debounce } : {}),
        },
        returning: false,
      });

      const reread = await this.findJobById(String(job.id), scope);
      if (!reread || reread.completedAt) return locales;
      current = reread;

      const stored = new Set(runLocales(current.input));
      undelivered = locales.filter((locale) => !stored.has(locale));
      if (undelivered.length === 0) return [];
    }
    return undelivered;
  }

  private async queueWorkflow(
    request: RequestShape,
    targets: StoredRunTarget[],
    waitUntil: Date | undefined,
    scope: RequestScope
  ): Promise<string | null> {
    const input: StoredWorkflowInput = {
      collection_slug: request.collectionSlug,
      collection_id: request.collectionId,
      source_lng: request.sourceLng,
      targets,
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

  async assignmentsOf(handles: string[]): Promise<JobAssignment[]> {
    if (handles.length === 0) return [];

    return (await this.findRawJobs({ id: { in: handles } })).map((job) => {
      const { collectionSlug, collectionId } = readCollectionRef(job.input);
      return {
        handle: String(job.id),
        collectionSlug,
        collectionId,
        startedBy: readRequester(job.input),
      };
    });
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

  async findByCollection(
    collectionSlug: CollectionSlug,
    filter?: Array<string | number> | TaskFilter
  ): Promise<Task[]> {
    const { documentIds, excludeCompleted, excludeGivenUpBefore } = toTaskFilter(filter);
    const wanted = documentIds ? new Set(documentIds.map(String)) : undefined;
    if (wanted?.size === 0) return [];

    const narrowed: Where[] = [ofCollection(collectionSlug)];
    if (excludeCompleted) narrowed.push({ completedAt: { exists: false } });
    if (excludeGivenUpBefore) narrowed.push(settledSince(excludeGivenUpBefore));
    if (wanted) narrowed.push(ofDocuments([...wanted]));

    const jobs = await this.findRawJobs({ and: narrowed });
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
