import { TranslatorConfigError } from "../../../../core/errors/index.js";
import type { CollectionSlug, Config, Payload, WorkflowConfig } from "payload";

import type { TaskRunner } from "../TaskRunner.interface.js";
import type { PayloadJobsRunnerOptions, PayloadJobsRunnerConfig, AutoRunConfig } from "./config.js";
import type { StoredTaskInput } from "./store/index.js";
import { PayloadJobsTaskRunner } from "./PayloadJobsTaskRunner.js";
import { chain, contribute } from "../../../shared/payload/contribute.js";
import {
  pointerOf,
  TaskInputSchema,
  toPayloadFields,
  withoutAHandle,
  WorkflowInputSchema,
} from "./store/index.js";
import type { PayloadJob, StoredWorkflowInput, TaskStatusByLocale } from "./store/index.js";
import { attemptsBefore, deliveredLocales, owedIfGaveUp, retryLimitOf } from "./model/index.js";
import { adoptLegacyJob } from "./legacy/index.js";
import type { AdoptionDeps } from "./legacy/index.js";
import type { TaskRunnerContext, TaskRunnerProvider } from "../TaskRunnerProvider.interface.js";
import type { RunnerCapabilities } from "../RunnerCapabilities.js";
import type { TaskEvent } from "../types.js";

const defaultAutoRun: Required<AutoRunConfig> = {
  cron: "* * * * *",
  limit: 50,
};

function resolveAutoRun(
  option: PayloadJobsRunnerOptions["autoRun"]
): PayloadJobsRunnerConfig["autoRun"] {
  if (option === false) return false;
  if (!option) return defaultAutoRun;
  return { ...defaultAutoRun, ...option };
}

type StoredJobInput = Partial<StoredWorkflowInput> & Record<string, unknown>;

const DEFAULT_STALE_JOB_TIMEOUT_MS = 5 * 60 * 1000;

const defaultValues = {
  taskName: "translate_document",
  queueName: "translations",
  jobsCollection: "payload-jobs",
  autoRun: defaultAutoRun,
  staleJobTimeoutMs: DEFAULT_STALE_JOB_TIMEOUT_MS,
  retries: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 5000,
    },
  },
};

/**
 * What Payload hands the registered task. `job` is carried only so a throw can be stored against it
 * for the workflow to read back.
 */
type TranslateLocaleTask = {
  req: { payload: Payload };
  job?: { id?: unknown; taskStatus?: TaskStatusByLocale };
  input: StoredTaskInput;
};

const A_QUEUE_CAN_BE_REACHED: RunnerCapabilities = { stop: true, run: true };

/**
 * Gives every job queued before the upgrade its pointer. Completed rows are skipped: their work is
 * over, and Payload may already have deleted them.
 */
async function adoptQueuedBeforeTheUpgrade(
  deps: AdoptionDeps,
  names: { workflowName: string; taskName: string }
): Promise<void> {
  const { docs } = await deps.payload.find({
    collection: deps.jobsCollection as CollectionSlug,
    depth: 0,
    pagination: false,
    where: {
      and: [
        {
          or: [
            { workflowSlug: { equals: names.workflowName } },
            { taskSlug: { equals: names.taskName } },
          ],
        },
        { completedAt: { exists: false } },
        withoutAHandle(),
      ],
    },
  });

  for (const job of docs as unknown as PayloadJob[]) await adoptLegacyJob(deps, job);
}

export class PayloadJobsRunnerProvider implements TaskRunnerProvider {
  readonly capabilities = A_QUEUE_CAN_BE_REACHED;

  private readonly config: PayloadJobsRunnerConfig;

  constructor(options?: PayloadJobsRunnerOptions) {
    const autoRun = resolveAutoRun(options?.autoRun);

    const staleJobTimeoutMs = options?.staleJobTimeoutMs ?? defaultValues.staleJobTimeoutMs;
    if (!Number.isFinite(staleJobTimeoutMs) || staleJobTimeoutMs <= 0) {
      throw new TranslatorConfigError(
        `[payload-plugin-translator] staleJobTimeoutMs must be a positive finite number (got ${staleJobTimeoutMs})`
      );
    }

    this.config = {
      taskName: options?.taskName ?? defaultValues.taskName,
      workflowName: `${options?.taskName ?? defaultValues.taskName}_locales`,
      queueName: options?.queueName ?? defaultValues.queueName,
      jobsCollection: options?.jobsCollection ?? defaultValues.jobsCollection,
      autoRun,
      staleJobTimeoutMs,
      retries: options?.retries ?? defaultValues.retries,
    };
  }

  create(payload: Payload, context: TaskRunnerContext): TaskRunner {
    return new PayloadJobsTaskRunner(payload, this.config, context);
  }

  configure(context: TaskRunnerContext): (config: Config) => Config {
    const { queueName, autoRun } = this.config;
    const thrown = new WeakMap<object, unknown>();

    return (config) => {
      // Read before `??=` creates the bag, so an absent `jobs` is not mistaken for one that opted in.
      const exclusivePerRun = Boolean(config.jobs?.enableConcurrencyControl);
      const jobs = (config.jobs ??= {});

      jobs.tasks = contribute(
        jobs.tasks,
        [this.translateOneLocale(context, thrown)],
        (registered) => registered.slug
      );
      jobs.workflows = contribute(
        jobs.workflows,
        [this.walkTheRunsLocales(context, thrown, exclusivePerRun)],
        (registered) => registered.slug
      );
      if (autoRun) {
        jobs.autoRun = contribute(
          jobs.autoRun,
          [{ queue: queueName, cron: autoRun.cron, limit: autoRun.limit }],
          (schedule) => `${schedule.queue}@${schedule.cron}`
        );
      }

      config.onInit = chain(config.onInit, this.reclaimAndAdopt(context));

      return config;
    };
  }

  /** A throw is kept against the job so the workflow can read back which locale gave up. */
  private translateOneLocale(context: TaskRunnerContext, thrown: WeakMap<object, unknown>) {
    const { taskName, retries } = this.config;

    return {
      slug: taskName,
      inputSchema: toPayloadFields(TaskInputSchema),
      retries,
      handler: async (args: TranslateLocaleTask) => {
        try {
          await context.handler(args.req.payload, {
            handle: args.input.handle,
            targetLng: args.input.target_lng,
            previousAttempts: attemptsBefore(
              args.job?.taskStatus?.[taskName]?.[args.input.target_lng]
            ),
          });
        } catch (error) {
          if (args.job) thrown.set(args.job, error);
          throw error;
        }
        return { output: {} };
      },
    };
  }

  private walkTheRunsLocales(
    context: TaskRunnerContext,
    thrown: WeakMap<object, unknown>,
    exclusivePerRun: boolean
  ): WorkflowConfig<StoredJobInput> {
    const { taskName, workflowName, jobsCollection, retries } = this.config;
    const retryLimit = retryLimitOf(retries);
    const { report } = context;

    return {
      slug: workflowName,
      inputSchema: toPayloadFields(WorkflowInputSchema),
      retries,
      ...(exclusivePerRun
        ? {
            concurrency: {
              key: ({ input }) => String(input.handle ?? ""),
              exclusive: true,
            },
          }
        : {}),
      handler: async ({ job, req, tasks }) => {
        const runLocale = tasks[taskName];
        const pointer =
          pointerOf(job as PayloadJob) ??
          (await adoptLegacyJob(
            { payload: req.payload, jobsCollection, report },
            job as PayloadJob
          ));
        if (pointer === null) return;

        const reportFor = (targetLng: string, event: TaskEvent) =>
          report(req.payload, { handle: pointer.handle, targetLng }, event);
        const deliveredBefore = deliveredLocales(job as PayloadJob);

        for (const target of pointer.locales) {
          try {
            await runLocale(target, { input: { handle: pointer.handle, target_lng: target } });
            if (!deliveredBefore.has(target)) await reportFor(target, { state: "delivered" });
          } catch (error) {
            const owed = thrown.has(job)
              ? owedIfGaveUp(job as PayloadJob, taskName, target, retryLimit, pointer.locales)
              : [];
            for (const dead of owed) {
              await reportFor(dead, { state: "failed", error: thrown.get(job) });
            }
            throw error;
          }
        }
      },
    };
  }

  /** Both halves are best-effort: a host whose queue cannot be tidied still boots. */
  private reclaimAndAdopt(context: TaskRunnerContext): (payload: Payload) => Promise<void> {
    const { jobsCollection, workflowName, taskName } = this.config;
    const { report } = context;

    return async (payload) => {
      try {
        await new PayloadJobsTaskRunner(payload, this.config, context).reclaimStaleJobs();
      } catch (err) {
        payload.logger?.error?.({
          err,
          msg: "[translator] failed to reclaim stale translation jobs",
        });
      }
      try {
        await adoptQueuedBeforeTheUpgrade(
          { payload, jobsCollection, report },
          { workflowName, taskName }
        );
      } catch (err) {
        payload.logger?.error?.({
          err,
          msg: "[translator] failed to adopt translation jobs queued before the upgrade",
        });
      }
    };
  }
}

export function createPayloadJobsRunner(options?: PayloadJobsRunnerOptions): TaskRunnerProvider {
  return new PayloadJobsRunnerProvider(options);
}
