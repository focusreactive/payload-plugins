import type { Endpoint } from "payload";
import { ANALYTICS_ENDPOINT_PATHS } from "../../constants/endpoints";
import { AnalyticsQuerySchema, formatZodIssues } from "../validateBody";
import { withAccess } from "../withAccess";
import { mapGa4Error } from "../errorMapping";
import { abSetupGate } from "./shared";
import { getAbOverview } from "../../services/queries/getAbOverview";
import type { AnalyticsPluginConfig } from "../../types/config";

export function buildAbKpisEndpoint(config: AnalyticsPluginConfig): Endpoint {
  return {
    path: ANALYTICS_ENDPOINT_PATHS.abKpis,
    method: "post",
    handler: withAccess(config, async (req) => {
      let body: unknown;
      try {
        body = await req.json?.();
      } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsed = AnalyticsQuerySchema.safeParse(body);
      if (!parsed.success)
        return Response.json({ error: formatZodIssues(parsed.error.issues) }, { status: 400 });

      try {
        const { kpis } = await getAbOverview(parsed.data, req);

        return Response.json(kpis);
      } catch (err) {
        const gate = abSetupGate(err);

        if (gate) {
          return Response.json({
            activeExperiments: 0,
            variantsLive: 0,
            exposedSessions: 0,
            leadConversions: 0,
            avgAgeDays: 0,
            needingAttention: 0,
            missing: gate.missing,
          });
        }

        const mapped = mapGa4Error(err);

        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    }),
  };
}
