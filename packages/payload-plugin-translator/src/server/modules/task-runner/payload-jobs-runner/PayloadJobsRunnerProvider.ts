import { TranslatorConfigError } from "../../../../core/errors/index.js";
import type { Config, Payload, WorkflowConfig } from "payload";

import type { TaskRunner } from "../TaskRunner.interface.js";
import type { PayloadJobsRunnerOptions, PayloadJobsRunnerConfig, AutoRunConfig } from "./config.js";
import type { StoredTaskInput, StoredWorkflowInput } from "./store/index.js";
import type { TranslationStrategyName } from "../../../../core/translation-pipeline/strategies/index.js";
import { PayloadJobsTaskRunner } from "./PayloadJobsTaskRunner.js";
import { chain, contribute } from "../../../shared/payload/contribute.js";
import {
  assignmentOf,
  readCollectionRef,
  TaskInputSchema,
  toPayloadFields,
  withLegacyCollection,
  WorkflowInputSchema,
} from "./store/index.js";
import { deliveredLocales, localesAsTheyStand, owedIfGaveUp, retryLimitOf } from "./model/index.js";
import type { TaskRunnerContext, TaskRunnerProvider } from "../TaskRunnerProvider.interface.js";
import type { TaskEvent } from "../types.js";
import type { Requester } from "../../../shared/payload/RequestScope.shapes.js";
import { asRequester } from "../../../shared/payload/RequestScope.shapes.js";

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
 * What Payload hands this plugin's registered task: the request it runs under, the row it belongs to
 * — carried only so a throw can be stored against it — and the locale's stored input.
 *
 * `strategy` is narrowed here and nowhere else. The column holds any bounded string, because a row
 * written by an older version may name a strategy this one dropped; this handler is the one place
 * that hands the value to something which only accepts the names this version has.
 */
type TranslateLocaleTask = {
  req: { payload: Payload };
  job?: { id?: unknown };
  input: StoredTaskInput & { strategy: TranslationStrategyName };
};

/**
 * Rows queued before the scope carried one `requester` object are already on disk as two nullable
 * columns, so both must be present before they read back as an identity.
 */
export function requesterOf(input: {
  requester_id?: string | number | null;
  requester_collection?: string | null;
}): Requester | null {
  return asRequester(input.requester_id, input.requester_collection);
}

export class PayloadJobsRunnerProvider implements TaskRunnerProvider {
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
    const { taskName, workflowName, queueName, retries, autoRun } = this.config;
    const retryLimit = retryLimitOf(retries);
    const { handler, collections, report } = context;
    const thrown = new WeakMap<object, unknown>();

    return (config) => {
      const inputSchema = withLegacyCollection(toPayloadFields(TaskInputSchema), collections);
      const workflowInputSchema = withLegacyCollection(
        toPayloadFields(WorkflowInputSchema),
        collections
      );

      const task = {
        slug: taskName,
        inputSchema,
        retries,
        handler: async (args: TranslateLocaleTask) => {
          const { collectionSlug, collectionId } = readCollectionRef(args.input);
          try {
            await handler(
              args.req.payload,
              {
                collection: collectionSlug,
                collectionId,
                sourceLng: args.input.source_lng,
                targetLng: args.input.target_lng,
                strategy: args.input.strategy,
                publishOnTranslation: args.input.publish_on_translation ?? false,
              },
              { requester: requesterOf(args.input) }
            );
          } catch (error) {
            if (args.job) thrown.set(args.job, error);
            throw error;
          }
          return { output: {} };
        },
      };

      const workflow: WorkflowConfig<StoredJobInput> = {
        slug: workflowName,
        inputSchema: workflowInputSchema,
        retries,
        ...(config.jobs?.enableConcurrencyControl
          ? {
              concurrency: {
                key: ({ input }) => `${input.collection_slug}:${input.collection_id}`,
                exclusive: true,
              },
            }
          : {}),
        handler: async ({ job, req, tasks }) => {
          const runLocale = tasks[taskName];
          const reportFor = async (locale: string, event: TaskEvent) => {
            const assignment = assignmentOf(job, locale);
            if (assignment) await report(req.payload, assignment, event);
          };
          const deliveredBefore = deliveredLocales(job);

          for (const { target, input } of localesAsTheyStand(job)) {
            try {
              await runLocale(target, { input });
              if (!deliveredBefore.has(target)) await reportFor(target, { state: "delivered" });
            } catch (error) {
              const owed = thrown.has(job) ? owedIfGaveUp(job, taskName, target, retryLimit) : [];
              for (const dead of owed) {
                await reportFor(dead.input.targetLng, { state: "failed", error: thrown.get(job) });
              }
              throw error;
            }
          }
        },
      };

      const jobs = (config.jobs ??= {});
      jobs.tasks = contribute(jobs.tasks, [task], (registered) => registered.slug);
      jobs.workflows = contribute(jobs.workflows, [workflow], (registered) => registered.slug);
      if (autoRun) {
        jobs.autoRun = contribute(
          jobs.autoRun,
          [{ queue: queueName, cron: autoRun.cron, limit: autoRun.limit }],
          (schedule) => `${schedule.queue}@${schedule.cron}`
        );
      }

      config.onInit = chain(config.onInit, async (payload) => {
        try {
          await new PayloadJobsTaskRunner(payload, this.config, context).reclaimStaleJobs();
        } catch (err) {
          payload.logger?.error?.({
            err,
            msg: "[translator] failed to reclaim stale translation jobs",
          });
        }
      });

      return config;
    };
  }
}

export function createPayloadJobsRunner(options?: PayloadJobsRunnerOptions): TaskRunnerProvider {
  return new PayloadJobsRunnerProvider(options);
}
