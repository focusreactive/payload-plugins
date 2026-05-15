import type { Endpoint } from "payload";

import type { TaskRunnerProvider } from "../../modules/task-runner";
import { withErrorHandler, withAccessCheck } from "../../shared";
import type { AccessGuard } from "../../shared";
import { GetDocumentStatusHandler } from "./handler";
import type { GetDocumentStatusConfig } from "./model";

/**
 * Creates the get document status endpoint
 */
export function createGetDocumentStatusRoute(
  config: GetDocumentStatusConfig,
  taskRunnerFactory: TaskRunnerProvider,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new GetDocumentStatusHandler(config, taskRunnerFactory);

  return {
    handler: withAccessCheck(
      withErrorHandler(handler.handle.bind(handler)),
      access
    ),
    method: "get",
    path: `${basePath}/document/:collection_slug/:collection_id`,
  };
}
