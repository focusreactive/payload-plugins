import type { Config, Field, Payload } from "payload";

import type { TranslationStrategyName } from "../../translation-pipeline/strategies";
import type { TaskRunner } from "../TaskRunner.interface";
import type {
  TaskRunnerContext,
  TaskRunnerProvider,
} from "../TaskRunnerProvider.interface";
import { PayloadJobsTaskRunner } from "./PayloadJobsTaskRunner";
import type {
  PayloadJobsRunnerOptions,
  PayloadJobsRunnerConfig,
  AutoRunConfig,
} from "./types";

const defaultAutoRun: Required<AutoRunConfig> = {
  cron: "* * * * *",
  limit: 50,
};

const defaultValues = {
  autoRun: defaultAutoRun,
  jobsCollection: "payload-jobs",
  queueName: "translations",
  retries: {
    attempts: 3,
    backoff: {
      delay: 5000, // 5s, 10s, 20s
      type: "exponential" as const,
    },
  },
  taskName: "translate_document",
};

/**
 * TaskRunnerProvider implementation using Payload Jobs.
 *
 * Configures Payload jobs, tasks, and autorun for translation processing.
 */
export class PayloadJobsRunnerProvider implements TaskRunnerProvider {
  private readonly config: PayloadJobsRunnerConfig;

  constructor(options?: PayloadJobsRunnerOptions) {
    const autoRun =
      options?.autoRun === false
        ? false
        : (options?.autoRun
          ? { ...defaultAutoRun, ...options.autoRun }
          : defaultAutoRun);

    this.config = {
      autoRun,
      jobsCollection: options?.jobsCollection ?? defaultValues.jobsCollection,
      queueName: options?.queueName ?? defaultValues.queueName,
      retries: options?.retries ?? defaultValues.retries,
      taskName: options?.taskName ?? defaultValues.taskName,
    };
  }

  create(payload: Payload): TaskRunner {
    return new PayloadJobsTaskRunner(payload, this.config);
  }

  configure(context: TaskRunnerContext): (config: Config) => Config {
    const { taskName, queueName, retries, autoRun } = this.config;
    const { handler, collections } = context;

    return (config) => {
      const inputSchema: Field[] = [
        {
          name: "collection",
          relationTo: collections,
          required: true,
          type: "relationship",
        },
        {
          maxLength: 256,
          name: "source_lng",
          required: true,
          type: "text",
        },
        {
          maxLength: 256,
          name: "target_lng",
          required: true,
          type: "text",
        },
        {
          maxLength: 256,
          name: "strategy",
          required: true,
          type: "text",
        },
        {
          defaultValue: false,
          name: "publish_on_translation",
          type: "checkbox",
        },
      ];

      const task = {
        handler: async (args: {
          req: { payload: Payload };
          input: {
            collection: { relationTo: string; value: string | number };
            source_lng: string;
            target_lng: string;
            strategy: TranslationStrategyName;
            publish_on_translation?: boolean;
          };
        }) => {
          await handler(args.req.payload, {
            collection: args.input.collection.relationTo,
            collectionId: args.input.collection.value,
            sourceLng: args.input.source_lng,
            targetLng: args.input.target_lng,
            strategy: args.input.strategy,
            publishOnTranslation: args.input.publish_on_translation ?? false,
          });
          return { output: {} };
        },
        inputSchema,
        retries,
        slug: taskName,
      };

      if (!config.jobs) {config.jobs = {};}
      if (!config.jobs.tasks) {config.jobs.tasks = [];}
      config.jobs.tasks.push(task);

      // Skip autoRun configuration when disabled (e.g., for Vercel/serverless deployments)
      if (autoRun) {
        const autoRunConfig = {
          cron: autoRun.cron,
          limit: autoRun.limit,
          queue: queueName,
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

      return config;
    };
  }
}

/**
 * Creates a TaskRunnerProvider that uses Payload Jobs for task execution.
 */
export function createPayloadJobsRunner(
  options?: PayloadJobsRunnerOptions
): TaskRunnerProvider {
  return new PayloadJobsRunnerProvider(options);
}
