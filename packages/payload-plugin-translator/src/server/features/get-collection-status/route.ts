import type { Endpoint } from "payload";

import type { TaskRunnerProvider } from "../../modules/task-runner";
import { withErrorHandler, withAccessCheck } from "../../shared";
import type { AccessGuard } from "../../shared";
import { GetCollectionStatusHandler } from "./handler";
import type { GetCollectionStatusConfig } from "./model";

/**
 * Creates the get collection status endpoint
 */
export function createGetCollectionStatusRoute(
  config: GetCollectionStatusConfig,
  taskRunnerFactory: TaskRunnerProvider,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new GetCollectionStatusHandler(config, taskRunnerFactory);

  return {
    handler: withAccessCheck(
      withErrorHandler(handler.handle.bind(handler)),
      access
    ),
    method: "get",
    path: `${basePath}/collection/:collection_slug`,
  };
}
