import type { Endpoint, PayloadRequest } from "payload";
import { ANALYTICS_ENDPOINT_PATHS } from "../constants/endpoints";
import { getSessionDetail } from "../services/queries/getSessionDetail";
import { getResolvedPagesConfig } from "../config";
import { buildPageFilterContext } from "../services/pageFilter/buildPageFilterContext";
import { AnalyticsQuerySchema, formatZodIssues } from "./validateBody";
import { mapGa4Error } from "./errorMapping";
import { withAccess } from "./withAccess";
import type { AnalyticsPluginConfig } from "../types/config";

interface PayloadRequestWithParams extends PayloadRequest {
  routeParams?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

function readSessionId(req: PayloadRequestWithParams) {
  const id = req.routeParams?.id ?? req.params?.id;

  return typeof id === "string" ? id : undefined;
}

export function buildSessionDetailEndpoint(config: AnalyticsPluginConfig): Endpoint {
  return {
    path: ANALYTICS_ENDPOINT_PATHS.sessionDetail,
    method: "post",
    handler: withAccess(config, async (req) => {
      const sessionId = readSessionId(req);

      if (!sessionId) {
        return Response.json({ error: "session id is required in path" }, { status: 400 });
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
        const pageFilter = await buildPageFilterContext(req.payload, getResolvedPagesConfig());
        const result = await getSessionDetail(config.ga4.propertyId, sessionId, parsed.data, pageFilter);

        return Response.json(result);
      } catch (err) {
        const mapped = mapGa4Error(err);

        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    }),
  };
}
