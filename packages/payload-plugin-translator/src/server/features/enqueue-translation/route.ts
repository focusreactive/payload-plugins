import type { Endpoint } from "payload";

import { withErrorHandler, withAccessCheck } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";

import type { EnqueueConfig } from "./model.js";
import { EnqueueTranslationHandler } from "./handler.js";

/**
 * Creates the enqueue translation endpoint
 */
export function createEnqueueRoute(
  taskRunnerFactory: TaskRunnerFactory,
  runRecordStoreFactory: RunRecordStoreFactory,
  config: EnqueueConfig,
  access: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new EnqueueTranslationHandler(config, taskRunnerFactory, runRecordStoreFactory);

  return {
    path: `${basePath}/enqueue`,
    method: "post",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access, "enqueue"),
  };
}
