import type { GraphEdge, GraphNode, SchemaGraph } from "./types.js";

const bySlug = (a: GraphNode, b: GraphNode): number =>
  a.kind === b.kind ? a.slug.localeCompare(b.slug) : a.kind === "collection" ? -1 : 1;

/** One field may yield several edges (one per target of a polymorphic relation). */
interface FieldRelation {
  edge: GraphEdge;
  targets: string[];
}

const groupByField = (edges: GraphEdge[], slugs: Map<string, string>): FieldRelation[] => {
  const fields = new Map<string, FieldRelation>();
  for (const edge of edges) {
    const key = `${edge.source}>${edge.path}`;
    const target = slugs.get(edge.target) ?? edge.target;
    const existing = fields.get(key);
    if (existing) {
      existing.targets.push(target);
    } else {
      fields.set(key, { edge, targets: [target] });
    }
  }
  return [...fields.values()].toSorted((a, b) => a.edge.path.localeCompare(b.edge.path));
};

const flags = (edge: GraphEdge): string =>
  [
    edge.hasMany ? "many" : "one",
    edge.required ? "required" : undefined,
    edge.type === "upload" ? "upload" : undefined,
    edge.polymorphic ? "polymorphic: value is `{ relationTo, value }`" : undefined,
    edge.localized ? "localized" : undefined,
    edge.blocks.length > 0 ? `in block ${edge.blocks.join(" > ")}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");

const queryHint = (edge: GraphEdge): string =>
  edge.queryPath === edge.path ? "" : ` (query as \`${edge.queryPath}\`)`;

const describeNode = (node: GraphNode): string =>
  [
    node.kind === "global" ? "global (single document)" : "collection",
    node.upload ? "upload (files)" : undefined,
    node.auth ? "auth (users who log in)" : undefined,
    node.versions ? "versions/drafts" : undefined,
    `${node.fieldCount} fields`,
  ]
    .filter(Boolean)
    .join(", ");

/**
 * A compact, deterministic markdown brief of the content model — entities, their relation
 * fields with cardinality, and what references them — meant for an LLM system prompt or a
 * CONTRIBUTING doc. Same graph in, same text out.
 */
export const toMarkdown = (graph: SchemaGraph): string => {
  const nodes = graph.nodes.toSorted(bySlug);
  const slugs = new Map(graph.nodes.map((node) => [node.id, node.slug]));
  const collections = nodes.filter((node) => node.kind === "collection").length;
  const globals = nodes.length - collections;

  const lines = [
    "# Content model",
    "",
    `Payload CMS: ${collections} collection${collections === 1 ? "" : "s"}${globals > 0 ? `, ${globals} global${globals === 1 ? "" : "s"}` : ""}. Slugs in \`code\`.`,
    "Relation fields: `path` → target (cardinality, flags). `[block]` in a path means the field sits inside that block type. Stored values are document ids; polymorphic values are `{ relationTo, value }`.",
    "Join fields are virtual, read-only reverse lists computed from another collection's relation field.",
  ];

  for (const node of nodes) {
    const outgoing = graph.edges.filter((edge) => edge.source === node.id && edge.type !== "join");
    const joins = graph.edges.filter((edge) => edge.source === node.id && edge.type === "join");
    const incoming = graph.edges.filter((edge) => edge.target === node.id && edge.type !== "join");

    lines.push("", `## ${node.label} (\`${node.slug}\`)`, describeNode(node));
    if (outgoing.length === 0 && joins.length === 0 && incoming.length === 0) {
      lines.push("- No relations.");
      continue;
    }
    for (const { edge, targets } of groupByField(outgoing, slugs)) {
      lines.push(
        `- \`${edge.path}\` → ${targets.map((slug) => `\`${slug}\``).join(" | ")} (${flags(edge)})${queryHint(edge)}`
      );
    }
    for (const { edge, targets } of groupByField(joins, slugs)) {
      lines.push(
        `- \`${edge.path}\`: join, lists \`${targets.join("` | `")}\` documents whose \`${edge.on ?? "?"}\` points here`
      );
    }
    const referrers = groupByField(incoming, slugs).map(
      ({ edge }) =>
        `\`${slugs.get(edge.source) ?? edge.source}.${edge.path}\` (${edge.hasMany ? "many" : "one"})`
    );
    if (referrers.length > 0) {
      lines.push(`- Referenced by: ${[...new Set(referrers)].toSorted().join(", ")}`);
    }
  }

  return `${lines.join("\n")}\n`;
};
