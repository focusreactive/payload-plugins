import type { Endpoint } from "payload";

import { withErrorHandler, withAccessCheck } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";

import { CancelHandler } from "./handler.js";

/**
 * Creates the batch cancel endpoint
 */
export function createCancelRoute(
  taskRunnerFactory: TaskRunnerFactory,
  runRecordStoreFactory: RunRecordStoreFactory,
  access: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new CancelHandler(taskRunnerFactory, runRecordStoreFactory);

  return {
    path: `${basePath}/cancel`,
    method: "delete",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access, "cancel"),
  };
}
