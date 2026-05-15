import type { Endpoint } from "payload";

import type { TaskRunnerProvider } from "../../modules/task-runner";
import { withErrorHandler, withAccessCheck } from "../../shared";
import type { AccessGuard } from "../../shared";
import { EnqueueTranslationHandler } from "./handler";
import type { EnqueueConfig } from "./model";

/**
 * Creates the enqueue translation endpoint
 */
export function createEnqueueRoute(
  taskRunnerFactory: TaskRunnerProvider,
  config: EnqueueConfig,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new EnqueueTranslationHandler(config, taskRunnerFactory);

  return {
    handler: withAccessCheck(
      withErrorHandler(handler.handle.bind(handler)),
      access
    ),
    method: "post",
    path: `${basePath}/enqueue`,
  };
}
