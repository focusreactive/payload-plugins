import type { CollectionSlug } from "payload";

import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import type { ProvenanceServiceFactory } from "../../modules/provenance/index.js";
import {
  LifecycleNotifier,
  taskFromHandlerInput,
  taskFromStored,
  withQueuedNotification,
} from "../../modules/lifecycle/index.js";
import type { TranslationLifecycleCallbacks } from "../../modules/lifecycle/index.js";
import type {
  TaskRunnerContext,
  TaskRunnerFactory,
  TaskRunnerProvider,
} from "../../modules/task-runner/index.js";

import { TranslateDocumentHandler } from "./handler.js";

type WireTranslateRunnerParams = {
  translationProvider: TranslationProvider;
  schemaMap: CollectionSchemaMap;
  provenanceServiceFactory?: ProvenanceServiceFactory;
  runner: TaskRunnerProvider;
  lifecycle: TranslationLifecycleCallbacks;
  collections: CollectionSlug[];
  inlineMarks?: boolean;
};

/**
 * Assemble the document-translation task pipeline: the {@link TranslateDocumentHandler}, the runner
 * context that wraps each task with lifecycle notifications, the runner's config modifier, and the
 * per-request {@link TaskRunnerFactory} (decorated with `onQueued` notification when configured).
 *
 * Extracted from the plugin's `init()` so the composition root stays a flat list — `plugin.ts` calls
 * this once and registers the returned `configModifier` through the shared builder.
 */
export function wireTranslateRunner({
  translationProvider,
  schemaMap,
  provenanceServiceFactory,
  runner,
  lifecycle,
  collections,
  inlineMarks = false,
}: WireTranslateRunnerParams): {
  taskRunnerFactory: TaskRunnerFactory;
  configModifier: ConfigModifier;
} {
  const translateHandler = new TranslateDocumentHandler(
    translationProvider,
    schemaMap,
    provenanceServiceFactory,
    inlineMarks
  );

  const runnerContext: TaskRunnerContext = {
    handler: async (payload, input, scope) => {
      const notifier = new LifecycleNotifier(lifecycle, payload.logger);
      const task = taskFromHandlerInput(input);
      try {
        await translateHandler.handle(
          payload,
          {
            collection: input.collection,
            collectionId: input.collectionId,
            sourceLng: input.sourceLng,
            targetLng: input.targetLng,
            strategy: input.strategy,
            publishOnTranslation: input.publishOnTranslation,
          },
          scope
        );
      } catch (error) {
        if (!runner.reportsFinalFailure) await notifier.failed(task, error);
        throw error; // rethrow so the runner marks the job failed
      }
      await notifier.completed(task);
    },
    collections,
    reportFinalFailure: async (payload, owed, error) => {
      const notifier = new LifecycleNotifier(lifecycle, payload.logger);
      for (const stopped of owed) await notifier.failed(taskFromStored(stopped), error);
    },
  };

  const taskRunnerFactory: TaskRunnerFactory = {
    create: (payload) => {
      const taskRunner = runner.create(payload, runnerContext.handler);
      return withQueuedNotification(taskRunner, new LifecycleNotifier(lifecycle, payload.logger));
    },
  };

  return { taskRunnerFactory, configModifier: runner.configure(runnerContext) };
}
