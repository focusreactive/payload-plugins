import type { Endpoint } from "payload";
import { AnalyticsQuerySchema, formatZodIssues } from "./validateBody";
import { withAccess } from "./withAccess";
import { mapGa4Error } from "./errorMapping";
import { createScopedGa4Client } from "../services/ga4DataClient/scopedClient";
import type { AnalyticsPluginConfig } from "../types/config";
import type { BlockDefinition, BlockId } from "../types/layout";

export function customBlockEndpointPath(blockId: BlockId) {
  return `/analytics/custom/${blockId}`;
}

export function buildCustomBlockEndpoint(
  config: AnalyticsPluginConfig,
  blockId: BlockId,
  definition: BlockDefinition,
): Endpoint {
  return {
    path: customBlockEndpointPath(blockId),
    method: "post",
    handler: withAccess(config, async (req) => {
      if (!definition.fetch) {
        return Response.json({ error: `Block "${blockId}" has no fetch function defined` }, { status: 500 });
      }

      let body: unknown;
      try {
        body = await req.json?.();
      } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsed = AnalyticsQuerySchema.safeParse(body);
      if (!parsed.success) {
        return Response.json({ error: formatZodIssues(parsed.error.issues) }, { status: 400 });
      }

      try {
        const ga4 = createScopedGa4Client(config.ga4.propertyId);
        const result = await definition.fetch({
          dateRange: parsed.data.dateRange,
          comparison: parsed.data.comparison ?? { kind: "none" },
          ga4,
          req,
        });

        return Response.json(result);
      } catch (err) {
        const mapped = mapGa4Error(err);

        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    }),
  };
}
