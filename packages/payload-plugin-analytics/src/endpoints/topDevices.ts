import type { Endpoint } from "payload";
import { ANALYTICS_ENDPOINT_PATHS } from "../constants/endpoints";
import { getTopDevices } from "../services/queries/getTopDevices";
import { getResolvedPagesConfig } from "../config";
import { buildPageFilterContext } from "../services/pageFilter/buildPageFilterContext";
import { TopNQuerySchema, formatZodIssues } from "./validateBody";
import { mapGa4Error } from "./errorMapping";
import { withAccess } from "./withAccess";
import type { AnalyticsPluginConfig } from "../types/config";

export function buildTopDevicesEndpoint(config: AnalyticsPluginConfig): Endpoint {
  return {
    path: ANALYTICS_ENDPOINT_PATHS.topDevices,
    method: "post",
    handler: withAccess(config, async (req) => {
      let body: unknown;

      try {
        body = await req.json?.();
      } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsed = TopNQuerySchema.safeParse(body);
      if (!parsed.success) {
        return Response.json({ error: formatZodIssues(parsed.error.issues) }, { status: 400 });
      }

      try {
        const pageFilter = await buildPageFilterContext(req, getResolvedPagesConfig());
        const result = await getTopDevices(config.ga4.propertyId, parsed.data, pageFilter);

        return Response.json(result);
      } catch (err) {
        const mapped = mapGa4Error(err);

        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    }),
  };
}
