import type { Endpoint } from "payload";
import { ANALYTICS_ENDPOINT_PATHS } from "../../constants/endpoints";
import { AbExperimentQuerySchema, formatZodIssues } from "../validateBody";
import { withAccess } from "../withAccess";
import { mapGa4Error } from "../errorMapping";
import { abSetupGate } from "./shared";
import { getAbTimeSeries } from "../../services/queries/getAbTimeSeries";
import type { AnalyticsPluginConfig } from "../../types/config";

export function buildAbExperimentTimeSeriesEndpoint(config: AnalyticsPluginConfig): Endpoint {
  return {
    path: ANALYTICS_ENDPOINT_PATHS.abExperimentTimeSeries,
    method: "post",
    handler: withAccess(config, async (req) => {
      let body: unknown;
      try {
        body = await req.json?.();
      } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsed = AbExperimentQuerySchema.safeParse(body);
      if (!parsed.success)
        return Response.json({ error: formatZodIssues(parsed.error.issues) }, { status: 400 });

      try {
        const result = await getAbTimeSeries(parsed.data.manifestKey, parsed.data);

        return Response.json(result);
      } catch (err) {
        const gate = abSetupGate(err);
        if (gate)
          return Response.json({ series: [], significanceDates: {}, missing: gate.missing });

        const mapped = mapGa4Error(err);

        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    }),
  };
}
