import type { Endpoint } from "payload";

import { withErrorHandler, withAccessCheck } from "../../shared";
import type { AccessGuard } from "../../shared";
import type { TaskRunnerFactory } from "../../modules/task-runner";

import type { EnqueueConfig } from "./model";
import { EnqueueTranslationHandler } from "./handler";

/**
 * Creates the enqueue translation endpoint
 */
export function createEnqueueRoute(
  taskRunnerFactory: TaskRunnerFactory,
  config: EnqueueConfig,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new EnqueueTranslationHandler(config, taskRunnerFactory);

  return {
    path: `${basePath}/enqueue`,
    method: "post",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  };
}
