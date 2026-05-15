import type { Endpoint } from "payload";

import type { TaskRunnerProvider } from "../../modules/task-runner";
import { withErrorHandler, withAccessCheck } from "../../shared";
import type { AccessGuard } from "../../shared";
import { CancelByCollectionHandler } from "./handler";
import type { CancelConfig } from "./model";

/**
 * Creates the cancel by collection endpoint
 */
export function createCancelByCollectionRoute(
  config: CancelConfig,
  taskRunnerFactory: TaskRunnerProvider,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new CancelByCollectionHandler(config, taskRunnerFactory);

  return {
    handler: withAccessCheck(
      withErrorHandler(handler.handle.bind(handler)),
      access
    ),
    method: "delete",
    path: `${basePath}/cancel-by-collection/:collection_slug`,
  };
}
