import type { Config, Field, Payload } from "payload";

import type { TaskRunner } from "../TaskRunner.interface";
import type { PayloadJobsRunnerOptions, PayloadJobsRunnerConfig, AutoRunConfig } from "./types";
import { PayloadJobsTaskRunner } from "./PayloadJobsTaskRunner";
import { readCollectionRef } from "./readCollectionRef";
import type { TaskRunnerContext, TaskRunnerProvider } from "../TaskRunnerProvider.interface";
import type { TranslationStrategyName } from "../../translation-pipeline/strategies";

const defaultAutoRun: Required<AutoRunConfig> = {
  cron: "* * * * *",
  limit: 50,
};

const defaultValues = {
  taskName: "translate_document",
  queueName: "translations",
  jobsCollection: "payload-jobs",
  autoRun: defaultAutoRun,
  retries: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 5000, // 5s, 10s, 20s
    },
  },
};

/**
 * TaskRunnerProvider implementation using Payload Jobs.
 *
 * Configures Payload jobs, tasks, and autorun for translation processing.
 */
export class PayloadJobsRunnerProvider implements TaskRunnerProvider {
  private readonly config: PayloadJobsRunnerConfig;

  constructor(options?: PayloadJobsRunnerOptions) {
    const autoRun = options?.autoRun === false ? false : options?.autoRun ? { ...defaultAutoRun, ...options.autoRun } : defaultAutoRun;

    this.config = {
      taskName: options?.taskName ?? defaultValues.taskName,
      queueName: options?.queueName ?? defaultValues.queueName,
      jobsCollection: options?.jobsCollection ?? defaultValues.jobsCollection,
      autoRun,
      retries: options?.retries ?? defaultValues.retries,
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
        // Flat text reference (ID-agnostic). Current shape that jobs are
        // written with — no relationship type validation against the target
        // collection's ID type, so string IDs work for number-id collections.
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
        /**
         * Legacy relationship reference, kept as a read-only fallback so jobs
         * queued before the ID-agnostic migration stay readable. No longer
         * written; demoted to `required: false` so new jobs (which omit it)
         * pass validation. Removed in the next major.
         * See docs/DEPRECATIONS.md#jobs-input-collection-field
         * @deprecated
         */
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

      const task = {
        slug: taskName,
        inputSchema,
        retries,
        handler: async (args: {
          req: { payload: Payload };
          input: {
            collection_slug?: string;
            collection_id?: string;
            // Legacy fallback shape, see docs/DEPRECATIONS.md#jobs-input-collection-field
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

      if (!config.jobs) config.jobs = {};
      if (!config.jobs.tasks) config.jobs.tasks = [];
      config.jobs.tasks.push(task);

      // Skip autoRun configuration when disabled (e.g., for Vercel/serverless deployments)
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
          config.jobs.autoRun = async (payload: Payload) => [...(await existingAutoRun(payload)), autoRunConfig];
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
export function createPayloadJobsRunner(options?: PayloadJobsRunnerOptions): TaskRunnerProvider {
  return new PayloadJobsRunnerProvider(options);
}
