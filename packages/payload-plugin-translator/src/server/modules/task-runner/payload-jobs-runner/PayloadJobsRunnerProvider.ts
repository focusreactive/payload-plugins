import { TranslatorConfigError } from "../../../../core/errors/index.js";
import type { Config, Field, Payload, WorkflowConfig } from "payload";

import type { TaskRunner } from "../TaskRunner.interface.js";
import type {
  PayloadJobsRunnerOptions,
  PayloadJobsRunnerConfig,
  AutoRunConfig,
  StoredWorkflowInput,
} from "./types.js";
import { PayloadJobsTaskRunner } from "./PayloadJobsTaskRunner.js";
import { handleOf } from "./handleOf.js";
import { readCollectionRef } from "./readCollectionRef.js";
import { owedIfGaveUp } from "./owedIfGaveUp.js";
import { retryLimitOf } from "./retryLimitOf.js";
import type { TaskRunnerContext, TaskRunnerProvider } from "../TaskRunnerProvider.interface.js";
import type { Requester } from "../../../shared/payload/RequestScope.shapes.js";
import { asRequester } from "../../../shared/payload/RequestScope.shapes.js";
import type { TranslationStrategyName } from "../../../../core/translation-pipeline/strategies/index.js";

const defaultAutoRun: Required<AutoRunConfig> = {
  cron: "* * * * *",
  limit: 50,
};

type StoredJobInput = Partial<StoredWorkflowInput> & Record<string, unknown>;
type RunLocaleTask = (taskID: string, args: { input: Record<string, unknown> }) => Promise<unknown>;

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
    const autoRun =
      options?.autoRun === false
        ? false
        : options?.autoRun
          ? { ...defaultAutoRun, ...options.autoRun }
          : defaultAutoRun;

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

  create(payload: Payload): TaskRunner {
    return new PayloadJobsTaskRunner(payload, this.config);
  }

  readonly reportsFinalFailure = true;

  configure(context: TaskRunnerContext): (config: Config) => Config {
    const { taskName, workflowName, queueName, retries, autoRun } = this.config;
    const retryLimit = retryLimitOf(retries);
    const { handler, collections, reportFinalFailure } = context;
    /**
     * What the plugin's own handler threw, kept until the run's loop can report it.
     *
     * Payload reads `message` off a task's error and throws a `TaskError` of its own
     * (`getRunTaskFunction.js:83`), so the plugin's error — and the exported error classes a host
     * matches on — is gone by the time the loop catches anything. Keyed by the job row, which
     * Payload passes by reference to both handlers registered below.
     */
    const thrown = new WeakMap<object, unknown>();

    return (config) => {
      const inputSchema: Field[] = [
        {
          type: "text",
          name: "collection_slug",
          required: true,
        },
        {
          type: "text",
          name: "collection_id",
          required: true,
        },
        {
          type: "relationship",
          name: "collection",
          relationTo: collections,
          required: false,
          admin: {
            readOnly: true,
            description: "Deprecated. See docs/DEPRECATIONS.md#jobs-input-collection-field",
          },
        },
        {
          type: "text",
          maxLength: 256,
          name: "source_lng",
          required: true,
        },
        {
          type: "text",
          maxLength: 256,
          name: "target_lng",
          required: true,
        },
        {
          type: "text",
          maxLength: 256,
          name: "strategy",
          required: true,
        },
        {
          type: "checkbox",
          name: "publish_on_translation",
          defaultValue: false,
        },
      ];

      const workflowInputSchema: Field[] = [
        ...inputSchema.filter((f) => "name" in f && f.name !== "target_lng"),
        { type: "json", name: "target_lngs", required: true },
        { type: "text", name: "requester_id" },
        { type: "text", name: "requester_collection" },
      ];

      const task = {
        slug: taskName,
        inputSchema,
        retries,
        handler: async (args: {
          req: { payload: Payload };
          job?: { id?: unknown };
          input: {
            collection_slug?: string;
            collection_id?: string;
            collection?: { relationTo: string; value: string | number };
            source_lng: string;
            target_lng: string;
            strategy: TranslationStrategyName;
            publish_on_translation?: boolean;
            requester_id?: string | number | null;
            requester_collection?: string | null;
          };
        }) => {
          const { collectionSlug, collectionId } = readCollectionRef(args.input);
          const handle = handleOf(args.job);
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
                ...(handle === null ? {} : { handle }),
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
          const runLocale = (tasks as Record<string, RunLocaleTask>)[taskName];
          for (let i = 0; ; i++) {
            const { target_lngs: targets, ...shared } = job.input;
            const target = targets?.[i];
            if (target === undefined) return;
            try {
              await runLocale(target, { input: { ...shared, target_lng: target } });
            } catch (error) {
              // A cancellation deletes the run's row under it, so Payload's own machinery throws —
              // that is not a locale giving up.
              const owed =
                reportFinalFailure && thrown.has(job)
                  ? owedIfGaveUp(job, taskName, target, retryLimit)
                  : [];
              if (owed.length > 0) {
                await reportFinalFailure?.(req.payload, owed, thrown.get(job));
              }
              throw error;
            }
          }
        },
      };

      if (!config.jobs) config.jobs = {};
      if (!config.jobs.tasks) config.jobs.tasks = [];
      config.jobs.tasks.push(task);
      if (!config.jobs.workflows) config.jobs.workflows = [];
      config.jobs.workflows.push(workflow);

      if (autoRun) {
        const autoRunConfig = {
          queue: queueName,
          cron: autoRun.cron,
          limit: autoRun.limit,
        };

        const existingAutoRun = config.jobs.autoRun;
        if (Array.isArray(existingAutoRun)) {
          existingAutoRun.push(autoRunConfig);
        } else if (typeof existingAutoRun === "function") {
          config.jobs.autoRun = async (payload: Payload) => [
            ...(await existingAutoRun(payload)),
            autoRunConfig,
          ];
        } else {
          config.jobs.autoRun = [autoRunConfig];
        }
      }

      const existingOnInit = config.onInit;
      config.onInit = async (payload) => {
        if (existingOnInit) await existingOnInit(payload);
        try {
          await new PayloadJobsTaskRunner(payload, this.config).reclaimStaleJobs();
        } catch (err) {
          payload.logger?.error?.({
            err,
            msg: "[translator] failed to reclaim stale translation jobs",
          });
        }
      };

      return config;
    };
  }
}

export function createPayloadJobsRunner(options?: PayloadJobsRunnerOptions): TaskRunnerProvider {
  return new PayloadJobsRunnerProvider(options);
}
