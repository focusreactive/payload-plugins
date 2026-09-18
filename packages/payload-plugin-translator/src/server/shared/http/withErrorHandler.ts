import { APIError } from "payload";

import { ServerResponse } from "./ServerResponse";
import { failureReasonText, toClientErrorMessage } from "./toClientErrorMessage";

/**
 * Wraps async handler with error handling.
 *
 * Every message on the way out goes through {@link toClientErrorMessage}, which answers from its own
 * catalogue for a known reason and otherwise says nothing specific outside development. A provider
 * error carries whatever the vendor put in it — an API key, a host, a connection string — and this is
 * the one path on which such an error reaches a browser directly; the queued path was already
 * sanitized and this brings the synchronous one in line with it. An `APIError` keeps its status,
 * because a caller needs to tell "you may not" from "it broke".
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error("[TranslateKit] Handler error:", e);

      // An `APIError` is Payload's or this plugin's own — "collection not available for
      // translation", "field path not found" — and a caller needs to read it to fix their request.
      // Everything else came from somewhere we do not control, and a provider error carries whatever
      // the vendor put in it, an API key included. Only the second kind is collapsed.
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
