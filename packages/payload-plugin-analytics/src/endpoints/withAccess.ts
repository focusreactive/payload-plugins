import type { PayloadHandler, PayloadRequest } from "payload";
import { resolveAccess } from "../services/access/resolveAccess";
import type { AnalyticsPluginConfig } from "../types/config";

export function withAccess(config: AnalyticsPluginConfig, handler: PayloadHandler): PayloadHandler {
  return async (req: PayloadRequest) => {
    const ok = await resolveAccess(config, req);

    if (!ok) return Response.json({ error: "Forbidden" }, { status: 403 });

    return handler(req);
  };
}
