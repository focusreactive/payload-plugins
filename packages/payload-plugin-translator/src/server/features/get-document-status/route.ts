import type { Endpoint } from "payload";

import { withErrorHandler, withAccessCheck } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";

import type { GetDocumentStatusConfig } from "./model.js";
import { GetDocumentStatusHandler } from "./handler.js";

/**
 * Creates the get document status endpoint
 */
export function createGetDocumentStatusRoute(
  config: GetDocumentStatusConfig,
  taskRunnerFactory: TaskRunnerFactory,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new GetDocumentStatusHandler(config, taskRunnerFactory);

  return {
    path: `${basePath}/document/:collection_slug/:collection_id`,
    method: "get",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  };
}
