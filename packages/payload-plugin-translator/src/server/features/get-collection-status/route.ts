import type { Endpoint } from "payload";

import { withErrorHandler, withAccessCheck } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";

import type { GetCollectionStatusConfig } from "./model.js";
import { GetCollectionStatusHandler } from "./handler.js";

/**
 * Creates the get collection status endpoint
 */
export function createGetCollectionStatusRoute(
  config: GetCollectionStatusConfig,
  runRecordStoreFactory: RunRecordStoreFactory,
  access: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new GetCollectionStatusHandler(config, runRecordStoreFactory);

  return {
    path: `${basePath}/collection/:collection_slug`,
    method: "get",
    handler: withAccessCheck(
      withErrorHandler(handler.handle.bind(handler)),
      access,
      "collection-status"
    ),
  };
}
