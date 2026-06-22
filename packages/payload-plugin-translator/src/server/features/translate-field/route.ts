import type { Endpoint } from "payload";

import { withAccessCheck, withErrorHandler } from "../../shared";
import type { AccessGuard } from "../../shared";

import type { FieldTranslationConfig } from "./model";
import { TranslateFieldHandler } from "./handler";

export type CreateFieldRouteArgs = FieldTranslationConfig & {
  access?: AccessGuard;
  basePath?: string;
};

/**
 * Creates the synchronous field-translation endpoint: `POST {basePath}/field`.
 * Wired with the same access + error-envelope plumbing as the document routes.
 */
export function createFieldRoute({
  schemaMap,
  translationProvider,
  access,
  basePath = "/translate",
}: CreateFieldRouteArgs): Endpoint {
  const handler = new TranslateFieldHandler({ schemaMap, translationProvider });

  return {
    path: `${basePath}/field`,
    method: "post",
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  };
}
