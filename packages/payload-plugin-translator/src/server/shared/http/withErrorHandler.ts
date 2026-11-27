import { APIError } from "payload";
import type { PayloadRequest } from "payload";

import { ServerResponse } from "./ServerResponse.js";
import { failureReasonText, toClientErrorMessage } from "./toClientErrorMessage.js";

/** What every translator route hands to the wrappers. */
export type RouteHandler = (req: PayloadRequest) => Promise<Response>;

/**
 * Non-`APIError` failures are collapsed through {@link toClientErrorMessage}: a provider error can
 * carry the vendor's own text, an API key included. An `APIError` is Payload's or this plugin's own
 * and keeps its message and status.
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req) => {
    try {
      return await handler(req);
    } catch (e) {
      console.error("[TranslateKit] Handler error:", e);

      if (e instanceof APIError) {
        return ServerResponse.custom(failureReasonText(e.message) ?? e.message, e.status);
      }
      if (e instanceof Error) {
        return ServerResponse.internalServerError(toClientErrorMessage(e.message));
      }
      return ServerResponse.internalServerError();
    }
  };
}
