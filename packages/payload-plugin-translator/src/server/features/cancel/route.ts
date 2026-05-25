import type { Endpoint } from "payload";

import type { TaskRunnerProvider } from "../../modules/task-runner";
import { withErrorHandler, withAccessCheck } from "../../shared";
import type { AccessGuard } from "../../shared";
import { CancelHandler } from "./handler";

/**
 * Creates the batch cancel endpoint
 */
export function createCancelRoute(
  taskRunnerFactory: TaskRunnerProvider,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new CancelHandler(taskRunnerFactory);

  return {
    handler: withAccessCheck(
      withErrorHandler(handler.handle.bind(handler)),
      access
    ),
    method: "delete",
    path: `${basePath}/cancel`,
  };
}
