import type { Endpoint } from "payload";

import { withAccessCheck, withErrorHandler } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import { ENDPOINTS } from "../../../types/wire/endpoints.js";

import { GetListStateHandler } from "./handler.js";
import type { GetListStateConfig } from "./model.js";

/**
 * Reuses the host's existing `collection-status` action, so this read needs no new entry in a
 * host's access config.
 */
export function createGetListStateRoute(
  config: GetListStateConfig,
  runRecordStoreFactory: RunRecordStoreFactory,
  access: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new GetListStateHandler(config, runRecordStoreFactory);

  return {
    path: `${basePath}${ENDPOINTS.listState.path}`,
    method: ENDPOINTS.listState.method,
    handler: withAccessCheck(
      withErrorHandler(handler.handle.bind(handler)),
      access,
      "collection-status"
    ),
  };
}
