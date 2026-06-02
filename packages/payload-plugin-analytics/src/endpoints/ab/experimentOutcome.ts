import type { Endpoint } from "payload";
import { ANALYTICS_ENDPOINT_PATHS } from "../../constants/endpoints";
import { AbExperimentQuerySchema, formatZodIssues } from "../validateBody";
import { withAccess } from "../withAccess";
import { mapGa4Error } from "../errorMapping";
import { abSetupGate } from "./shared";
import { getAbExperimentStats } from "../../services/queries/getAbExperimentStats";
import { shapeOutcome } from "../../services/queries/shapeAbPanels";
import { getPluginConfig } from "../../config";
import { resolveAbConfig } from "../../config/resolveAbConfig";
import type { AnalyticsPluginConfig } from "../../types/config";

export function buildAbExperimentOutcomeEndpoint(config: AnalyticsPluginConfig): Endpoint {
  return {
    path: ANALYTICS_ENDPOINT_PATHS.abExperimentOutcome,
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

        return Response.json(shapeOutcome(stats, ab));
      } catch (err) {
        const gate = abSetupGate(err);

        if (gate)
          return Response.json({
            rows: [],
            winnerBucket: null,
            leaderBucket: null,
            alpha: ab.stats.alpha,
            sessionFloor: ab.winRate.sessionFloor,
            missing: gate.missing,
          });

        const mapped = mapGa4Error(err);

        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    }),
  };
}
