import { APIError } from "payload";

import { ServerResponse } from "./ServerResponse";

/**
 * Wraps async handler with error handling.
 * Catches APIError and generic Error, returns appropriate HTTP response.
 */
export function withErrorHandler<
  T extends (...args: any[]) => Promise<Response>,
>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("[TranslateKit] Handler error:", error);

      if (error instanceof APIError) {
        return ServerResponse.custom(error.message, error.status);
      }
      if (error instanceof Error) {
        return ServerResponse.internalServerError(error.message);
      }
      return ServerResponse.internalServerError();
    }
  }) as T;
}
