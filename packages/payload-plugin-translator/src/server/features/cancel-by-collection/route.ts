import type { Endpoint } from "payload";

import { withErrorHandler, withAccessCheck } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";

import type { CancelConfig } from "./model.js";
import { CancelByCollectionHandler } from "./handler.js";

/**
 * Creates the cancel by collection endpoint
 */
export function createCancelByCollectionRoute(
  config: CancelConfig,
  taskRunnerFactory: TaskRunnerFactory,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new CancelByCollectionHandler(config, taskRunnerFactory);

  return {
    path: `${basePath}/cancel-by-collection/:collection_slug`,
    method: "delete",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  };
}
