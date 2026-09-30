import { APIError } from "payload";

import { ServerResponse } from "./ServerResponse.js";
import { failureReasonText, toClientErrorMessage } from "./toClientErrorMessage.js";

/**
 * Non-`APIError` failures are collapsed through {@link toClientErrorMessage}: a provider error can
 * carry the vendor's own text, an API key included. An `APIError` is Payload's or this plugin's own
 * and keeps its message and status.
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
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
  }) as T;
}
