import type { Payload, Where } from "payload";

import type { TaskRunner } from "../TaskRunner.interface.js";
import type { TaskRunnerContext } from "../TaskRunnerProvider.interface.js";
import type { EnqueueAssignment, TaskInput, RunResult } from "../types.js";
import type { PayloadJobsRunnerConfig } from "./config.js";
import type { PayloadJob, StoredWorkflowInput } from "./store/index.js";
import { ofHandles, pointerOf } from "./store/index.js";
import { owedOnCancel } from "./model/index.js";
import type { RequestScope } from "../../../shared/payload/RequestScope.shapes.js";
import { freshReq } from "../../../shared/payload/RequestScope.shapes.js";

const ENQUEUE_CONCURRENCY = 10;

type QueueWorkflow = (args: {
  workflow: string;
  queue: string;
  waitUntil?: Date;
  input: StoredWorkflowInput;
  req?: { transactionID?: string | number };
}) => Promise<{ id?: unknown } | undefined>;

/**
 * What a run stores once for all of its locales. Two requests that differ in any of it cannot share
 * a run, which is why they are grouped by it before anything is queued — and none of it reaches the
 * job row, which carries a pointer.
 */
type RunGroup = {
  collectionSlug: string;
  collectionId: string;
  sourceLng: string;
  publishOnTranslation: boolean;
  requesterId: string | number | null;
  requesterCollection: string | null;
};

function runGroupOf(task: TaskInput, scope: RequestScope): RunGroup {
  return {
    collectionSlug: task.collectionSlug,
    collectionId: String(task.collectionId),
    sourceLng: task.sourceLng,
    publishOnTranslation: task.publishOnTranslation,
    requesterId: scope.requester?.userId ?? null,
    requesterCollection: scope.requester?.userCollection ?? null,
  };
}

function runGroupKey(task: TaskInput, scope: RequestScope): string {
  return JSON.stringify(runGroupOf(task, scope));
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
    const byRunGroup = new Map<string, TaskInput[]>();
    for (const task of tasks) {
      const key = runGroupKey(task, scope);
      const group = byRunGroup.get(key) ?? [];
      group.push(task);
      byRunGroup.set(key, group);
    }

    const groups = [...byRunGroup.values()];
    const assigned: EnqueueAssignment[] = [];
    for (let i = 0; i < groups.length; i += ENQUEUE_CONCURRENCY) {
      const served = await Promise.all(
        groups.slice(i, i + ENQUEUE_CONCURRENCY).map((group) => this.serve(group, scope))
      );
      for (const entries of served) assigned.push(...entries);
    }
    return assigned;
  }

  /**
   * One run per request group, named by this plugin rather than by the queue.
   *
   * The `queued` reports must land before the job is queued: a cron that picks the job up first
   * finds no record, translates nothing, and leaves a row that is never settled — which blocks the
   * document for good.
   */
  private async serve(group: TaskInput[], scope: RequestScope): Promise<EnqueueAssignment[]> {
    const [first] = group;
    const request = runGroupOf(first, scope);
    const locales = [...new Set(group.map((task) => task.targetLng))];
    const asked = new Map(group.map((task) => [task.targetLng, task]));
    const handle = crypto.randomUUID();

    for (const targetLng of locales) {
      await this.context.report(
        this.payload,
        { handle, targetLng },
        {
          state: "queued",
          work: {
            collectionSlug: first.collectionSlug,
            collectionId: request.collectionId,
            sourceLng: request.sourceLng,
            filters: asked.get(targetLng)?.filters,
            publishOnTranslation: request.publishOnTranslation,
          },
        },
        scope
      );
    }

    await this.queueWorkflow(handle, locales, first.waitUntil, scope);

    return locales.map((targetLng) => ({
      collectionSlug: first.collectionSlug,
      collectionId: request.collectionId,
      sourceLng: request.sourceLng,
      targetLng,
      handle,
    }));
  }

  private async queueWorkflow(
    handle: string,
    locales: string[],
    waitUntil: Date | undefined,
    scope: RequestScope
  ): Promise<void> {
    const queueJob = this.payload.jobs.queue as unknown as QueueWorkflow;
    await queueJob({
      workflow: this.config.workflowName,
      queue: this.config.queueName,
      waitUntil,
      input: { handle, locales },
      req: freshReq(scope),
    });
  }

  async stop(handles: string[]): Promise<void> {
    if (handles.length === 0) return;

    const jobs = await this.findRawJobs(ofHandles(handles));
    for (const job of jobs) {
      const pointer = pointerOf(job);
      if (!pointer) continue;
      for (const targetLng of owedOnCancel(job, pointer.locales)) {
        await this.context.report(
          this.payload,
          { handle: pointer.handle, targetLng },
          { state: "cancelled" }
        );
      }
    }

    const ids = jobs.map((job) => job.id);
    if (ids.length === 0) return;

    await this.payload.jobs.cancel({
      where: { and: [this.ownJobs(), { id: { in: ids } }] },
      queue: this.config.queueName,
    });

    await this.payload.delete({
      collection: this.config.jobsCollection,
      where: { and: [this.ownJobs(), { id: { in: ids } }] },
    });
  }

  async run(handle: string): Promise<RunResult> {
    const job = await this.findJobByHandle(handle);
    if (!job) {
      return { success: false, error: "not_found" };
    }
    if (job.completedAt) {
      return { success: false, error: "already_completed" };
    }
    if (job.processing && !this.isStale(job.updatedAt)) {
      return { success: false, error: "already_running" };
    }
    await this.clearPickerBlockers(job.id);

    const result = await this.payload.jobs.run({
      queue: this.config.queueName,
      where: { id: { equals: job.id } },
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

  private async clearPickerBlockers(id: string | number): Promise<void> {
    await this.payload.update({
      collection: this.config.jobsCollection,
      depth: 0,
      where: { id: { equals: id } },
      data: { processing: false, hasError: false, error: null, waitUntil: null },
    });
  }

  private isStale(updatedAt: string): boolean {
    const parsed = Date.parse(updatedAt);
    if (Number.isNaN(parsed)) return true;
    return Date.now() - parsed > this.config.staleJobTimeoutMs;
  }

  private ownJobs(): Where {
    return {
      or: [
        { workflowSlug: { equals: this.config.workflowName } },
        { taskSlug: { equals: this.config.taskName } },
      ],
    };
  }

  private async findJobByHandle(handle: string): Promise<PayloadJob | undefined> {
    const [job] = await this.findRawJobs(ofHandles([handle]));
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
