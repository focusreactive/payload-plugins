import { getAccessResults } from "payload";
import type { Endpoint, PayloadRequest } from "payload";

import { toMermaid } from "./graph/toMermaid.js";
import { ENDPOINT_BASE } from "./lib/constants.js";
import { getVisibleGraph } from "./lib/getVisibleGraph.js";
import { getOptions } from "./lib/options.js";

/** Shared guard for every plugin endpoint: `null` when allowed, an error response otherwise. */
export const denyUnlessAllowed = async (req: PayloadRequest): Promise<Response | null> => {
  const allowed = await getOptions(req.payload.config).access({ req });
  return allowed ? null : Response.json({ error: "Forbidden" }, { status: 403 });
};

/** `GET /api/relations-graph` — the graph as JSON, or as Mermaid with `?format=mermaid`. */
export const graphEndpoint: Endpoint = {
  handler: async (req) => {
    const denied = await denyUnlessAllowed(req);
    if (denied) {
      return denied;
    }

    const permissions = await getAccessResults({ req });
    const graph = getVisibleGraph(req, permissions);

    if (req.searchParams?.get("format") === "mermaid") {
      return new Response(toMermaid(graph), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return Response.json(graph);
  },
  method: "get",
  path: ENDPOINT_BASE,
};
