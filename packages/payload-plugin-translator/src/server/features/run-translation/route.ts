import type { Endpoint } from "payload";

import type { TaskRunnerProvider } from "../../modules/task-runner";
import { withErrorHandler, withAccessCheck } from "../../shared";
import type { AccessGuard } from "../../shared";
import { RunTranslationHandler } from "./handler";

/**
 * Creates the run translation endpoint
 */
export function createRunRoute(
  taskRunnerFactory: TaskRunnerProvider,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new RunTranslationHandler(taskRunnerFactory);

  return {
    handler: withAccessCheck(
      withErrorHandler(handler.handle.bind(handler)),
      access
    ),
    method: "post",
    path: `${basePath}/run/:id`,
  };
}
