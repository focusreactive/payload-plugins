import type { Endpoint } from "payload";
import { ANALYTICS_ENDPOINT_PATHS } from "../../constants/endpoints";
import { AbExperimentQuerySchema, formatZodIssues } from "../validateBody";
import { withAccess } from "../withAccess";
import { mapGa4Error } from "../errorMapping";
import { abSetupGate } from "./shared";
import { getAbExperimentStats } from "../../services/queries/getAbExperimentStats";
import { shapeExposure } from "../../services/queries/shapeAbPanels";
import { getPluginConfig } from "../../config";
import { resolveAbConfig } from "../../config/resolveAbConfig";
import type { AnalyticsPluginConfig } from "../../types/config";

export function buildAbExperimentExposureEndpoint(config: AnalyticsPluginConfig): Endpoint {
  return {
    path: ANALYTICS_ENDPOINT_PATHS.abExperimentExposure,
    method: "post",
    handler: withAccess(config, async (req) => {
      let body: unknown;
      try {
        body = await req.json?.();
      } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsed = AbExperimentQuerySchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: formatZodIssues(parsed.error.issues) }, { status: 400 });

      const ab = resolveAbConfig(getPluginConfig().ab)!;

      try {
        const stats = await getAbExperimentStats(parsed.data.manifestKey, parsed.data, req);

        return Response.json(shapeExposure(stats, ab));
      } catch (err) {
        const gate = abSetupGate(err);
        if (gate) return Response.json({ buckets: [], srmPassed: true, srmPValue: 1, missing: gate.missing });

        const mapped = mapGa4Error(err);

        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    }),
  };
}
