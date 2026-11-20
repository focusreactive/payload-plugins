import type { PayloadRequest, SanitizedPermissions } from "payload";

import { buildSchemaGraph } from "../graph/buildSchemaGraph.js";
import type { SchemaGraph } from "../graph/types.js";
import { getOptions } from "./options.js";

/**
 * The schema graph as this user may see it: plugin options applied, and every collection or
 * global the user has no read access to removed together with the edges touching it.
 */
export const getVisibleGraph = (
  req: PayloadRequest,
  permissions: SanitizedPermissions
): SchemaGraph => {
  const options = getOptions(req.payload.config);
  const graph = buildSchemaGraph(req.payload.config, options);

  const nodes = graph.nodes.filter((node) =>
    node.kind === "collection"
      ? Boolean(permissions.collections?.[node.slug]?.read)
      : Boolean(permissions.globals?.[node.slug]?.read)
  );
  const visible = new Set(nodes.map((node) => node.id));

  return {
    edges: graph.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)),
    nodes,
  };
};
