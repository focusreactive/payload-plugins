import type { PayloadRequest } from "payload";
import type { AnalyticsPluginConfig } from "../../types/config";

export async function resolveAccess(config: AnalyticsPluginConfig, req: PayloadRequest) {
  const predicate = config.access ?? (({ req: r }: { req: PayloadRequest }) => Boolean(r.user));

  return await predicate({ req });
}
