import type { CollectionSlug, Field, PayloadRequest } from "payload";

import type { TranslationStrategyName } from "../../modules/translation-pipeline/strategies";
import type { TranslateDocumentHandler } from "./handler";
import type { TaskConfig, AutoRunConfig } from "./model";
import {
  TASK_NAME,
  QUEUE_NAME,
  DEFAULT_AUTO_RUN,
  taskInputSchema,
} from "./model";

interface TaskInput {
  collection: {
    relationTo: CollectionSlug;
    value: string | number | Record<string, unknown>;
  };
  source_lng: string;
  target_lng: string;
  strategy: TranslationStrategyName;
  publish_on_translation?: boolean;
}

export interface PayloadTaskConfig {
  slug: string;
  inputSchema: Field[];
  retries?: TaskConfig["retries"];
  handler: (args: {
    req: PayloadRequest;
    input: TaskInput;
  }) => Promise<{ output: Record<string, never> }>;
}

interface CreateTaskOptions {
  collections: CollectionSlug[];
  handler: TranslateDocumentHandler;
  retries?: TaskConfig["retries"];
}

/**
 * Creates a Payload task definition for document translation
 */
export function createTranslateDocumentTask(
  options: CreateTaskOptions
): PayloadTaskConfig {
  const { collections, handler, retries } = options;

  return {
    handler: async (args) => {
      await handler.handle(args.req.payload, {
        collection: args.input.collection.relationTo,
        collectionId: args.input.collection.value as string | number,
        sourceLng: args.input.source_lng,
        targetLng: args.input.target_lng,
        strategy: args.input.strategy,
        publishOnTranslation: args.input.publish_on_translation ?? false,
      });

      return { output: {} };
    },
    inputSchema: [
      {
        type: "relationship",
        name: "collection",
        relationTo: collections,
        required: true,
      },
      ...taskInputSchema.slice(1),
    ],
    retries,
    slug: TASK_NAME,
  };
}

/**
 * Creates auto-run configuration for the job queue
 */
export function createAutoRunConfig(
  options?: Partial<AutoRunConfig>
): AutoRunConfig {
  return {
    cron: options?.cron ?? DEFAULT_AUTO_RUN.cron,
    limit: options?.limit ?? DEFAULT_AUTO_RUN.limit,
    queue: QUEUE_NAME,
  };
}

export { TASK_NAME, QUEUE_NAME };
