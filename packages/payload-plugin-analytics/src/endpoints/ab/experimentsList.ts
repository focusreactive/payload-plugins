import type { Endpoint } from "payload";
import { ANALYTICS_ENDPOINT_PATHS } from "../../constants/endpoints";
import { AnalyticsQuerySchema, formatZodIssues } from "../validateBody";
import { withAccess } from "../withAccess";
import { mapGa4Error } from "../errorMapping";
import { abSetupGate } from "./shared";
import { getAbOverview } from "../../services/queries/getAbOverview";
import type { AnalyticsPluginConfig } from "../../types/config";

export function buildAbExperimentsListEndpoint(config: AnalyticsPluginConfig): Endpoint {
  return {
    path: ANALYTICS_ENDPOINT_PATHS.abExperimentsList,
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
        const { rows } = await getAbOverview(parsed.data, req);

        return Response.json({ rows });
      } catch (err) {
        const gate = abSetupGate(err);
        if (gate) return Response.json({ rows: [], missing: gate.missing });

        const mapped = mapGa4Error(err);

        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    }),
  };
}
