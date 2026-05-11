import type { PayloadRequest } from "payload";
import type { AnalyticsPluginConfig } from "../../types/config";

export async function resolveAccess(config: AnalyticsPluginConfig, req: PayloadRequest) {
  const predicate = config.access ?? (({ req }: { req: PayloadRequest }) => Boolean(req.user));

  return await predicate({ req });
}
