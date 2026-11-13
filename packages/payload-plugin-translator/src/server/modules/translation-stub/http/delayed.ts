import type { RouteHandler } from "../../../shared/http/withErrorHandler.js";

export function delayed(handler: RouteHandler, latencyMs: number): RouteHandler {
  if (latencyMs <= 0) return handler;
  return async (req) => {
    await new Promise((resolve) => {
      setTimeout(resolve, latencyMs);
    });
    return handler(req);
  };
}
