import type { CollectionSlug } from "payload";

import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import type { ProvenanceServiceFactory } from "../../modules/provenance/index.js";
import { LifecycleNotifier, taskFromAssignment } from "../../modules/lifecycle/index.js";
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
 * context that turns what the runner reports into the host's callbacks, the runner's config
 * modifier, and the per-request {@link TaskRunnerFactory}.
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
    },
    collections,
    report: (payload, assignment, event) => {
      const notifier = new LifecycleNotifier(lifecycle, payload.logger);
      const task = taskFromAssignment(assignment);
      switch (event.state) {
        case "queued":
          return notifier.queued(task);
        case "delivered":
          return notifier.completed(task);
        case "failed":
          return notifier.failed(task, event.error);
        case "cancelled":
          return notifier.cancelled(task);
      }
    },
  };

  const taskRunnerFactory: TaskRunnerFactory = {
    create: (payload) => runner.create(payload, runnerContext),
  };

  return { taskRunnerFactory, configModifier: runner.configure(runnerContext) };
}
