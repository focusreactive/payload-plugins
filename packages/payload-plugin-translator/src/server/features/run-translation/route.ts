import type { Endpoint } from "payload";

import { withErrorHandler, withAccessCheck } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";

import { RunTranslationHandler } from "./handler.js";

/**
 * Creates the run translation endpoint
 */
export function createRunRoute(
  taskRunnerFactory: TaskRunnerFactory,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new RunTranslationHandler(taskRunnerFactory);

  return {
    path: `${basePath}/run/:id`,
    method: "post",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  };
}
