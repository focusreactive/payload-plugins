import { TranslatorConfigError } from "../../../../core/errors/index.js";
import type { Config, Payload, WorkflowConfig } from "payload";

import type { TaskRunner } from "../TaskRunner.interface.js";
import type { PayloadJobsRunnerOptions, PayloadJobsRunnerConfig, AutoRunConfig } from "./config.js";
import type { StoredTaskInput } from "./store/index.js";
import { PayloadJobsTaskRunner } from "./PayloadJobsTaskRunner.js";
import { chain, contribute } from "../../../shared/payload/contribute.js";
import { pointerOf, TaskInputSchema, toPayloadFields, WorkflowInputSchema } from "./store/index.js";
import type { PayloadJob, StoredWorkflowInput, TaskStatusByLocale } from "./store/index.js";
import {
  attemptsBefore,
  deliveredLocales,
  owedIfGaveUp,
  retryLimitOf,
  WhatOurHandlerDid,
} from "./model/index.js";
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
    const did = new WhatOurHandlerDid();

    return (config) => {
      // Read before `??=` creates the bag, so an absent `jobs` is not mistaken for one that opted in.
      const exclusivePerRun = Boolean(config.jobs?.enableConcurrencyControl);
      const jobs = (config.jobs ??= {});

      jobs.tasks = contribute(
        jobs.tasks,
        [this.translateOneLocale(context, did)],
        (registered) => registered.slug
      );
      jobs.workflows = contribute(
        jobs.workflows,
        [this.walkTheRunsLocales(context, did, exclusivePerRun)],
        (registered) => registered.slug
      );
      if (autoRun) {
        jobs.autoRun = contribute(
          jobs.autoRun,
          [{ queue: queueName, cron: autoRun.cron, limit: autoRun.limit }],
          (schedule) => `${schedule.queue}@${schedule.cron}`
        );
      }

      config.onInit = chain(config.onInit, this.reclaimWithoutBlockingBoot(context));

      return config;
    };
  }

  private translateOneLocale(context: TaskRunnerContext, did: WhatOurHandlerDid) {
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
          did.note(args.job, args.input.target_lng, { kind: "failed", error });
          throw error;
        }
        did.note(args.job, args.input.target_lng, { kind: "translated" });
        return { output: {} };
      },
    };
  }

  private walkTheRunsLocales(
    context: TaskRunnerContext,
    did: WhatOurHandlerDid,
    exclusivePerRun: boolean
  ): WorkflowConfig<StoredJobInput> {
    const { taskName, workflowName, retries } = this.config;
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
        const pointer = pointerOf(job as PayloadJob);
        if (pointer === null) {
          req.payload.logger?.error?.({
            jobId: (job as PayloadJob).id,
            msg: "[translator] a queued translation names no run and was skipped; it was queued before 1.0, or its input is damaged",
          });
          return;
        }

        const reportFor = (targetLng: string, event: TaskEvent) => {
          return report(req.payload, { handle: pointer.handle, targetLng }, event);
        };

        const deliveredBefore = deliveredLocales(job as PayloadJob);
        const deliver = async (targetLng: string) => {
          if (!deliveredBefore.has(targetLng)) await reportFor(targetLng, { state: "delivered" });
        };
        let saidTheQueueCannotRecord = false;

        for (const target of pointer.locales) {
          try {
            await runLocale(target, { input: { handle: pointer.handle, target_lng: target } });
            await deliver(target);
          } catch (error) {
            const ours = did.forLocale(job, target);
            if (ours === undefined) throw error;
            if (ours.kind === "translated") {
              if (!saidTheQueueCannotRecord) {
                saidTheQueueCannotRecord = true;
                req.payload.logger?.warn?.(
                  `[payload-plugin-translator] the queue could not record a finished step of run ${pointer.handle} and its log will read empty; the translations themselves are done and are not repeated. The write it refused is its own: ${String(error)}`
                );
              }
              await deliver(target);
              continue;
            }

            const owed = owedIfGaveUp(
              job as PayloadJob,
              taskName,
              target,
              retryLimit,
              pointer.locales
            );
            for (const dead of owed) {
              await reportFor(
                dead,
                dead === target ? { state: "failed", error: ours.error } : { state: "abandoned" }
              );
            }
            throw error;
          }
        }
      },
    };
  }

  private reclaimWithoutBlockingBoot(
    context: TaskRunnerContext
  ): (payload: Payload) => Promise<void> {
    return async (payload) => {
      try {
        await new PayloadJobsTaskRunner(payload, this.config, context).reclaimStaleJobs();
      } catch (err) {
        payload.logger?.error?.({
          err,
          msg: "[translator] failed to reclaim stale translation jobs",
        });
      }
    };
  }
}

export function createPayloadJobsRunner(options?: PayloadJobsRunnerOptions): TaskRunnerProvider {
  return new PayloadJobsRunnerProvider(options);
}
