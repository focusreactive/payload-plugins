import type { Endpoint } from "payload";

import { withErrorHandler, withAccessCheck } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";

import { RunTranslationHandler } from "./handler.js";
import type { RunConfig } from "./model.js";

/**
 * Creates the run translation endpoint
 */
export function createRunRoute(
  config: RunConfig,
  taskRunnerFactory: TaskRunnerFactory,
  runRecordStoreFactory: RunRecordStoreFactory,
  access: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new RunTranslationHandler(config, taskRunnerFactory, runRecordStoreFactory);

  return {
    path: `${basePath}/run/:collection_slug/:collection_id`,
    method: "post",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access, "run"),
  };
}
