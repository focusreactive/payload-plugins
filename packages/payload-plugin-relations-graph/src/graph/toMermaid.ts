import type { SchemaGraph } from "./types.js";

const safeId = (id: string): string => id.replace(/[^\w]/gu, "_");

/** Mermaid flowchart source for the graph — paste into docs, PRs, Notion or an LLM prompt. */
export const toMermaid = (graph: SchemaGraph): string => {
  const lines = ["flowchart LR"];
  for (const node of graph.nodes) {
    const label = node.label.replace(/"/gu, "'");
    lines.push(
      node.kind === "global"
        ? `  ${safeId(node.id)}(["${label}"])`
        : `  ${safeId(node.id)}["${label}"]`
    );
  }
  for (const edge of graph.edges) {
    const cardinality = edge.hasMany ? "many" : "one";
    const label = `${edge.path} · ${cardinality}`.replace(/"/gu, "'");
    const arrow = edge.type === "join" ? "-.->" : "-->";
    lines.push(`  ${safeId(edge.source)} ${arrow}|"${label}"| ${safeId(edge.target)}`);
  }
  return lines.join("\n");
};
