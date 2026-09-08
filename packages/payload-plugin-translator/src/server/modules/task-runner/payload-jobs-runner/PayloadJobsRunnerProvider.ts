import type { Config, Field, Payload, WorkflowConfig } from "payload";

import type { TaskRunner } from "../TaskRunner.interface";
import type {
  PayloadJobsRunnerOptions,
  PayloadJobsRunnerConfig,
  AutoRunConfig,
  StoredWorkflowInput,
} from "./types";
import { PayloadJobsTaskRunner } from "./PayloadJobsTaskRunner";
import { readCollectionRef } from "./readCollectionRef";
import type { TaskRunnerContext, TaskRunnerProvider } from "../TaskRunnerProvider.interface";
import type { TranslationStrategyName } from "../../../../core/translation-pipeline/strategies";

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
      throw new Error(
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

  configure(context: TaskRunnerContext): (config: Config) => Config {
    const { taskName, workflowName, queueName, retries, autoRun } = this.config;
    const { handler, collections } = context;

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
      ];

      const task = {
        slug: taskName,
        inputSchema,
        retries,
        handler: async (args: {
          req: { payload: Payload };
          input: {
            collection_slug?: string;
            collection_id?: string;
            collection?: { relationTo: string; value: string | number };
            source_lng: string;
            target_lng: string;
            strategy: TranslationStrategyName;
            publish_on_translation?: boolean;
          };
        }) => {
          const { collectionSlug, collectionId } = readCollectionRef(args.input);
          await handler(args.req.payload, {
            collection: collectionSlug,
            collectionId,
            sourceLng: args.input.source_lng,
            targetLng: args.input.target_lng,
            strategy: args.input.strategy,
            publishOnTranslation: args.input.publish_on_translation ?? false,
          });
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
        handler: async ({ job, tasks }) => {
          const runLocale = (tasks as Record<string, RunLocaleTask>)[taskName];
          for (let i = 0; ; i++) {
            const { target_lngs: targets, ...shared } = job.input;
            const target = targets?.[i];
            if (target === undefined) return;
            await runLocale(target, { input: { ...shared, target_lng: target } });
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
