import type { Endpoint } from "payload";

import { withErrorHandler, withAccessCheck } from "../../shared";
import type { AccessGuard } from "../../shared";

import type { StalenessConfig } from "./model";
import { GetDocumentStalenessHandler } from "./getDocumentStaleness.handler";
import { DismissStalenessHandler } from "./dismissStaleness.handler";

/** GET per-locale staleness for one document. */
export function createGetDocumentStalenessRoute(
  config: StalenessConfig,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new GetDocumentStalenessHandler(config);

  return {
    path: `${basePath}/stale/:collection_slug/:collection_id`,
    method: "get",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  };
}

/** POST to dismiss (acknowledge) staleness of one target locale. */
export function createDismissStalenessRoute(
  config: StalenessConfig,
  access?: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new DismissStalenessHandler(config);

  return {
    path: `${basePath}/stale/dismiss`,
    method: "post",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  };
}
