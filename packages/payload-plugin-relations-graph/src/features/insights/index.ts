import { getAccessResults } from "payload";
import type { Endpoint, PayloadRequest } from "payload";

import { denyUnlessAllowed } from "../../endpoints.js";
import { ENDPOINT_BASE } from "../../lib/constants.js";
import { getVisibleGraph } from "../../lib/getVisibleGraph.js";
import type { ResolvedRelationsGraphOptions } from "../../types.js";
import { analyzeSchema, sortFindings } from "./analyzeSchema.js";
import { analyzeStats } from "./analyzeStats.js";
import { computeStats, DEFAULT_SCAN_LIMIT, MAX_SCAN_LIMIT } from "./computeStats.js";

const scanLimitOf = (req: PayloadRequest): number => {
  const raw = Number(req.searchParams?.get("scanLimit"));
  return Number.isFinite(raw) && raw > 0
    ? Math.min(MAX_SCAN_LIMIT, Math.max(100, Math.floor(raw)))
    : DEFAULT_SCAN_LIMIT;
};

/** `GET /api/relations-graph/stats` — document counts, relation fill rates, unreferenced documents. */
const statsEndpoint: Endpoint = {
  handler: async (req) => {
    const denied = await denyUnlessAllowed(req);
    if (denied) {
      return denied;
    }
    return Response.json(await computeStats(req, { scanLimit: scanLimitOf(req) }));
  },
  method: "get",
  path: `${ENDPOINT_BASE}/stats`,
};

/**
 * `GET /api/relations-graph/insights` — schema findings; add `?data=true` to also compute
 * live statistics and include the findings drawn from them (plus the stats themselves).
 */
const insightsEndpoint: Endpoint = {
  handler: async (req) => {
    const denied = await denyUnlessAllowed(req);
    if (denied) {
      return denied;
    }
    const graph = getVisibleGraph(req, await getAccessResults({ req }));
    const schema = analyzeSchema(graph);
    if (req.searchParams?.get("data") !== "true") {
      return Response.json({ findings: schema });
    }
    const stats = await computeStats(req, { scanLimit: scanLimitOf(req) });
    return Response.json({
      findings: sortFindings([...schema, ...analyzeStats(graph, stats)]),
      stats,
    });
  },
  method: "get",
  path: `${ENDPOINT_BASE}/insights`,
};

/** REST endpoints of the insights feature (health checks, live data statistics). */
export const insightsEndpoints = (_options: ResolvedRelationsGraphOptions): Endpoint[] => [
  statsEndpoint,
  insightsEndpoint,
];

export { analyzeSchema } from "./analyzeSchema.js";
export { analyzeStats } from "./analyzeStats.js";
export type { EdgeStats, Finding, FindingSeverity, NodeStats, RelationsStats } from "./types.js";
