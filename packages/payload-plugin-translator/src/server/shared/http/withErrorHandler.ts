import { APIError } from "payload";

import { ServerResponse } from "./ServerResponse";
import { failureReasonText } from "./toClientErrorMessage";

/**
 * Wraps async handler with error handling.
 * Catches APIError and generic Error, returns appropriate HTTP response.
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error("[TranslateKit] Handler error:", e);

      if (e instanceof APIError) {
        return ServerResponse.custom(e.message, e.status);
      }
      if (e instanceof Error) {
        return ServerResponse.internalServerError(failureReasonText(e.message) ?? e.message);
      }
      return ServerResponse.internalServerError();
    }
  }) as T;
}
