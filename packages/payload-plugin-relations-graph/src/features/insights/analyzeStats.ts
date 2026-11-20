import type { GraphEdge, GraphNode, SchemaGraph } from "../../graph/types.js";
import { fieldRef, sortFindings } from "./analyzeSchema.js";
import type { Finding, RelationsStats } from "./types.js";

/** Below this many source documents, "never used" / "rarely used" is just an empty project. */
export const MIN_DOCS_FOR_USAGE = 3;
/** "Rarely used" needs a bigger sample… */
export const MIN_DOCS_FOR_RARE = 10;
/** …and a fill rate below this. */
export const RARE_FILL_RATE = 0.2;

const plural = (count: number, one: string, many: string): string =>
  `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

const percent = (part: number, whole: number): string =>
  `${whole === 0 ? 0 : Math.round((part / whole) * 100)}%`;

/**
 * "Lookup" collections (categories, authors, tags…) only make sense when something points at
 * them: they point at no other content themselves (uploads and self-references aside) and every
 * field pointing at them is a plain, single-collection relation.
 */
export const isLookupCollection = (graph: SchemaGraph, node: GraphNode): boolean => {
  const nodes = new Map(graph.nodes.map((item) => [item.id, item]));
  const pointsAtContent = graph.edges.some(
    (edge) =>
      edge.type !== "join" &&
      edge.source === node.id &&
      edge.target !== node.id &&
      !nodes.get(edge.target)?.upload
  );
  const incoming = graph.edges.filter(
    (edge) => edge.type !== "join" && edge.target === node.id && edge.source !== node.id
  );
  return !pointsAtContent && incoming.length > 0 && incoming.every((edge) => !edge.polymorphic);
};

/** Fields (polymorphic ones merged) pointing at a node, as `articles.cover` refs. */
const referringFields = (graph: SchemaGraph, node: GraphNode): string[] => {
  const nodes = new Map(graph.nodes.map((item) => [item.id, item]));
  return [
    ...new Set(
      graph.edges
        .filter((edge) => edge.type !== "join" && edge.target === node.id)
        .map((edge) => fieldRef(nodes, edge))
    ),
  ];
};

const edgeName = (nodes: Map<string, GraphNode>, edge: GraphEdge): string =>
  edge.polymorphic
    ? `${fieldRef(nodes, edge)} → ${nodes.get(edge.target)?.slug ?? edge.target}`
    : fieldRef(nodes, edge);

/**
 * Findings from live statistics: documents not referenced by any relation field (uploads and
 * lookup collections), required relations left empty, relations never or rarely used.
 */
export const analyzeStats = (graph: SchemaGraph, stats: RelationsStats): Finding[] => {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const findings: Finding[] = [];

  for (const node of graph.nodes) {
    const nodeStats = stats.nodes[node.id];
    if (
      node.kind !== "collection" ||
      !nodeStats ||
      nodeStats.total === null ||
      nodeStats.unreferenced === null ||
      nodeStats.unreferenced === 0
    ) {
      continue;
    }
    const lookup = !node.upload && isLookupCollection(graph, node);
    if (!node.upload && !lookup) {
      continue;
    }
    const { total, unreferenced } = nodeStats;
    const fields = referringFields(graph, node);
    const what = node.upload ? "files" : "documents";
    findings.push({
      check: node.upload ? "unreferenced-uploads" : "unreferenced-documents",
      detail: `${unreferenced.toLocaleString("en-US")} of ${plural(total, `${what.slice(0, -1)}`, what)} in ${node.label} are not referenced by any relation field (checked: ${fields.join(", ")}). References inside rich text are not counted, so review before deleting anything.${nodeStats.unreferencedIncomplete ? " Some collections that can point here are not readable for you, so the real number may be lower." : ""}`,
      edgeIds: graph.edges
        .filter((edge) => edge.type !== "join" && edge.target === node.id)
        .map((edge) => edge.id),
      id: `${node.upload ? "unreferenced-uploads" : "unreferenced-documents"}:${node.id}`,
      nodeIds: [node.id],
      severity: "info",
      source: "data",
      title: `${unreferenced.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} ${node.label.toLowerCase()} ${what === "files" ? "files " : ""}not referenced by any relation field`,
    });
  }

  for (const edge of graph.edges) {
    const edgeStats = stats.edges[edge.id];
    if (
      !edgeStats ||
      edgeStats.filled === null ||
      edgeStats.total === null ||
      edgeStats.total === 0
    ) {
      continue;
    }
    const { filled, total } = edgeStats;
    const source = nodes.get(edge.source);
    if (!source || source.kind !== "collection") {
      continue;
    }
    const docs = plural(
      total,
      `${source.label.toLowerCase()} document`,
      source.label.toLowerCase()
    );
    const name = edgeName(nodes, edge);
    const base = {
      edgeIds: [edge.id],
      nodeIds: [...new Set([edge.source, edge.target])],
      source: "data" as const,
    };

    if (edge.required && filled < total && edge.blocks.length === 0) {
      findings.push({
        ...base,
        check: "required-missing",
        detail: `${name} is required, but ${total - filled} of ${docs} have no value — probably created before the field became required, or by code that skips validation. They will fail validation the next time someone saves them.`,
        id: `required-missing:${edge.id}`,
        severity: "warning",
        title: `Required ${name} is empty in ${total - filled} of ${total}`,
      });
      continue;
    }
    if (edge.required) {
      continue;
    }
    if (filled === 0 && total >= MIN_DOCS_FOR_USAGE) {
      findings.push({
        ...base,
        check: "relation-unused",
        detail: `${name} is empty in all ${docs}. If editors never use it, consider removing it; if they should, it may be hidden or hard to find in the edit view.`,
        id: `relation-unused:${edge.id}`,
        severity: "info",
        title: `${name} is never set`,
      });
    } else if (total >= MIN_DOCS_FOR_RARE && filled / total < RARE_FILL_RATE) {
      findings.push({
        ...base,
        check: "relation-rare",
        detail: `${name} is set on only ${filled} of ${docs} (${percent(filled, total)}). Check whether it is still needed, or whether content is missing.`,
        id: `relation-rare:${edge.id}`,
        severity: "info",
        title: `${name} is set on ${filled} of ${total} (${percent(filled, total)})`,
      });
    }
  }

  return sortFindings(findings);
};
