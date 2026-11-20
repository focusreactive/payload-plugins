import type { Endpoint } from "payload";

import { withAccessCheck, withErrorHandler } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import { ENDPOINTS } from "../../../types/wire/endpoints.js";

import { GetDocumentStateHandler } from "./handler.js";
import type { GetDocumentStateConfig } from "./model.js";

/**
 * Reuses the host's existing `document-status` action, so this read needs no new entry in a host's
 * access config.
 */
export function createGetDocumentStateRoute(
  config: GetDocumentStateConfig,
  runRecordStoreFactory: RunRecordStoreFactory,
  access: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new GetDocumentStateHandler(config, runRecordStoreFactory);

  return {
    path: `${basePath}${ENDPOINTS.documentState.path}`,
    method: ENDPOINTS.documentState.method,
    handler: withAccessCheck(
      withErrorHandler(handler.handle.bind(handler)),
      access,
      "document-status"
    ),
  };
}
