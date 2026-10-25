import type { CollectionSlug } from "payload";

import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import type { ChainMember, Criteria } from "../../modules/translation-run/index.js";
import { LifecycleNotifier, taskFromAssignment } from "../../modules/lifecycle/index.js";
import type { TranslationLifecycleCallbacks } from "../../modules/lifecycle/index.js";
import type {
  TaskRunnerContext,
  TaskRunnerFactory,
  TaskRunnerProvider,
} from "../../modules/task-runner/index.js";

import { translateDocument } from "./translateDocument.js";

type WireTranslateRunnerParams = {
  translationProvider: TranslationProvider;
  schemaMap: CollectionSchemaMap;
  modules: readonly ChainMember[];
  criteria?: Criteria;
  runner: TaskRunnerProvider;
  lifecycle: TranslationLifecycleCallbacks;
  collections: CollectionSlug[];
};

/**
 * Assemble the document-translation task pipeline: the runner context that hands each job to
 * {@link translateDocument} and turns what the runner reports into the host's callbacks, the
 * runner's config modifier, and the per-request {@link TaskRunnerFactory}.
 */
export function wireTranslateRunner({
  translationProvider,
  schemaMap,
  modules,
  criteria,
  runner,
  lifecycle,
  collections,
}: WireTranslateRunnerParams): {
  taskRunnerFactory: TaskRunnerFactory;
  configModifier: ConfigModifier;
} {
  const deps = { translationProvider, schemaMap, modules, criteria };

  const runnerContext: TaskRunnerContext = {
    handler: (payload, input, scope) => translateDocument(deps, payload, input, scope ?? {}),
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
