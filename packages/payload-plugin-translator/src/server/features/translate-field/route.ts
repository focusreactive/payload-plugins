import type { Endpoint } from "payload";

import { withAccessCheck, withErrorHandler } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";

import type { FieldTranslationConfig } from "./model.js";
import { TranslateFieldHandler } from "./handler.js";

export type CreateFieldRouteArgs = FieldTranslationConfig & {
  access?: AccessGuard;
  basePath?: string;
};

/**
 * Creates the synchronous field-translation endpoint: `POST {basePath}/field`.
 * Wired with the same access + error-envelope plumbing as the document routes.
 */
export function createFieldRoute({
  access,
  basePath = "/translate",
  ...config
}: CreateFieldRouteArgs): Endpoint {
  // Passed through whole: naming the fields here is how one gets dropped without the build noticing.
  const handler = new TranslateFieldHandler(config);

  return {
    path: `${basePath}/field`,
    method: "post",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  };
}
