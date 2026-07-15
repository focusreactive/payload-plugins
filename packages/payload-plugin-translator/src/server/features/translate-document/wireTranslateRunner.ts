import type { CollectionSlug } from "payload";

import type { TranslationProvider } from "../../../core/translation-providers";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { ConfigModifier } from "../../../types/ConfigModifier";
import type { ProvenanceServiceFactory } from "../../modules/provenance";
import {
  LifecycleNotifier,
  taskFromHandlerInput,
  withQueuedNotification,
} from "../../modules/lifecycle";
import type { TranslationLifecycleCallbacks } from "../../modules/lifecycle";
import type {
  TaskRunnerContext,
  TaskRunnerFactory,
  TaskRunnerProvider,
} from "../../modules/task-runner";

import { TranslateDocumentHandler } from "./handler";

type WireTranslateRunnerParams = {
  translationProvider: TranslationProvider;
  schemaMap: CollectionSchemaMap;
  provenanceServiceFactory?: ProvenanceServiceFactory;
  runner: TaskRunnerProvider;
  lifecycle: TranslationLifecycleCallbacks;
  collections: CollectionSlug[];
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
}: WireTranslateRunnerParams): {
  taskRunnerFactory: TaskRunnerFactory;
  configModifier: ConfigModifier;
} {
  const translateHandler = new TranslateDocumentHandler(
    translationProvider,
    schemaMap,
    provenanceServiceFactory
  );

  const runnerContext: TaskRunnerContext = {
    handler: async (payload, input) => {
      const notifier = new LifecycleNotifier(lifecycle, payload.logger);
      const task = taskFromHandlerInput(input);
      try {
        await translateHandler.handle(payload, {
          collection: input.collection,
          collectionId: input.collectionId,
          sourceLng: input.sourceLng,
          targetLng: input.targetLng,
          strategy: input.strategy,
          publishOnTranslation: input.publishOnTranslation,
        });
      } catch (error) {
        await notifier.failed(task, error);
        throw error; // rethrow so the runner marks the job failed
      }
      await notifier.completed(task);
    },
    collections,
  };

  // Bind the context once so routes receive a self-sufficient factory: the runner needs no mutable
  // per-instance handler state, and create() has no "configure() must run first" ordering coupling.
  // When an `onQueued` callback is set, decorate the runner so `enqueue` fires it.
  const taskRunnerFactory: TaskRunnerFactory = {
    create: (payload) => {
      const taskRunner = runner.create(payload, runnerContext.handler);
      if (!lifecycle.onQueued) return taskRunner;
      return withQueuedNotification(taskRunner, new LifecycleNotifier(lifecycle, payload.logger));
    },
  };

  return { taskRunnerFactory, configModifier: runner.configure(runnerContext) };
}
