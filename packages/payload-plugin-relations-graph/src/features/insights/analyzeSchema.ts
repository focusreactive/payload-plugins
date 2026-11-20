import type { GraphEdge, GraphNode, SchemaGraph } from "../../graph/types.js";
import type { Finding } from "./types.js";

/** A hub needs at least this many relation fields pointing at it… */
export const HUB_MIN_FIELDS = 5;
/** …declared in at least this many different collections/globals. */
export const HUB_MIN_SOURCES = 3;
/** A polymorphic field accepting this many collections or more is flagged. */
export const POLYMORPHIC_MAX_TARGETS = 4;
/** Relations nested in this many blocks (block inside block) or more are flagged. */
export const DEEP_BLOCK_LEVELS = 2;
/** …or whose query path has this many segments or more. */
export const DEEP_PATH_SEGMENTS = 4;

const SEVERITY_ORDER = { info: 1, warning: 0 } as const;

/** `articles.category` — how a field is named in finding texts. */
export const fieldRef = (graph: SchemaGraph | Map<string, GraphNode>, edge: GraphEdge): string => {
  const nodes = graph instanceof Map ? graph : new Map(graph.nodes.map((node) => [node.id, node]));
  const slug = nodes.get(edge.source)?.slug ?? edge.source.replace(/^[a-z]+:/u, "");
  return `${slug}.${edge.path}`;
};

const listText = (items: string[], max = 6): string =>
  items.length > max
    ? `${items.slice(0, max).join(", ")} and ${items.length - max} more`
    : items.join(", ");

/** Internal plugin fields (`_abVariantOf`, `_status`…) are not part of the content model proper. */
const isInternalField = (edge: GraphEdge): boolean =>
  edge.path.split(/[.[\]]/u).some((segment) => segment.startsWith("_"));

const isStoredRelation = (edge: GraphEdge): boolean => edge.type !== "join";

/** Strongly connected components (Tarjan), used to find cycles of required relations. */
const stronglyConnected = (ids: string[], next: Map<string, string[]>): string[][] => {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let counter = 0;

  const visit = (id: string): void => {
    index.set(id, counter);
    low.set(id, counter);
    counter += 1;
    stack.push(id);
    onStack.add(id);
    for (const to of next.get(id) ?? []) {
      if (!index.has(to)) {
        visit(to);
        low.set(id, Math.min(low.get(id) ?? 0, low.get(to) ?? 0));
      } else if (onStack.has(to)) {
        low.set(id, Math.min(low.get(id) ?? 0, index.get(to) ?? 0));
      }
    }
    if (low.get(id) === index.get(id)) {
      const component: string[] = [];
      let member: string | undefined;
      do {
        member = stack.pop();
        if (member !== undefined) {
          onStack.delete(member);
          component.push(member);
        }
      } while (member !== undefined && member !== id);
      components.push(component.toSorted());
    }
  };

  for (const id of ids) {
    if (!index.has(id)) {
      visit(id);
    }
  }
  return components;
};

type Check = (graph: SchemaGraph, nodes: Map<string, GraphNode>) => Finding[];

/**
 * Required relations that form a loop: to create the first document of any collection in
 * the loop, a document of the next one must already exist.
 */
const requiredCycles: Check = (graph, nodes) => {
  // Relations inside blocks are only required when the block is added, so they cannot block creation.
  const required = graph.edges.filter(
    (edge) =>
      isStoredRelation(edge) &&
      edge.required &&
      edge.blocks.length === 0 &&
      nodes.get(edge.source)?.kind === "collection"
  );
  const next = new Map<string, string[]>();
  for (const edge of required) {
    next.set(edge.source, [...(next.get(edge.source) ?? []), edge.target]);
  }
  const findings: Finding[] = [];
  for (const component of stronglyConnected([...next.keys()].toSorted(), next)) {
    const members = new Set(component);
    const edges = required.filter((edge) => members.has(edge.source) && members.has(edge.target));
    if (edges.length === 0) {
      continue;
    }
    const fields = edges.map((edge) => fieldRef(nodes, edge));
    const [first] = component;
    if (component.length === 1 && first) {
      const label = nodes.get(first)?.label ?? first;
      findings.push({
        check: "required-cycle",
        detail: `${listText(fields)} is required and points back to ${label} itself, so the very first document cannot be saved — there is nothing to select yet. Make the field optional (validate it in a hook if needed).`,
        edgeIds: edges.map((edge) => edge.id),
        id: `required-cycle:${first}`,
        nodeIds: [first],
        severity: "warning",
        source: "schema",
        title: `Required self-reference: ${listText(fields, 2)}`,
      });
      continue;
    }
    const labels = component.map((id) => nodes.get(id)?.label ?? id);
    findings.push({
      check: "required-cycle",
      detail: `Required relations form a loop: ${listText(fields, 8)}. None of ${listText(labels)} can be created first without the others already existing. Make at least one of these fields optional.`,
      edgeIds: edges.map((edge) => edge.id),
      id: `required-cycle:${component.join("+")}`,
      nodeIds: component,
      severity: "warning",
      source: "schema",
      title: `Required relations loop between ${listText(labels, 4)}`,
    });
  }
  return findings;
};

/** Collections many fields point at: renaming, re-permissioning or deleting from them ripples far. */
const hubs: Check = (graph, nodes) =>
  graph.nodes.flatMap((node) => {
    const incoming = graph.edges.filter(
      (edge) =>
        isStoredRelation(edge) &&
        edge.target === node.id &&
        edge.source !== node.id &&
        !isInternalField(edge)
    );
    const sources = [...new Set(incoming.map((edge) => edge.source))];
    if (incoming.length < HUB_MIN_FIELDS || sources.length < HUB_MIN_SOURCES) {
      return [];
    }
    const sourceLabels = sources.map((id) => nodes.get(id)?.label ?? id);
    return [
      {
        check: "hub",
        detail: `${incoming.length} relation fields in ${sources.length} collections/globals point to ${node.label} (${listText(sourceLabels)}). Changing its slug, access rules or required fields, or deleting its documents, affects all of them — review them together.`,
        edgeIds: incoming.map((edge) => edge.id),
        id: `hub:${node.id}`,
        nodeIds: [node.id, ...sources],
        severity: "info" as const,
        source: "schema" as const,
        title: `${node.label} is a hub: ${incoming.length} fields depend on it`,
      },
    ];
  });

/** Upload collections no field points to: files can only be reached through rich text or by URL. */
const unlinkedUploads: Check = (graph) =>
  graph.nodes
    .filter(
      (node) =>
        node.kind === "collection" &&
        node.upload &&
        !graph.edges.some((edge) => isStoredRelation(edge) && edge.target === node.id)
    )
    .map((node) => ({
      check: "unlinked-upload",
      detail: `No upload or relationship field points to ${node.label}. Its files can only be used from rich text or by URL, so nothing in the admin shows where (or whether) a file is used.`,
      edgeIds: [],
      id: `unlinked-upload:${node.id}`,
      nodeIds: [node.id],
      severity: "info" as const,
      source: "schema" as const,
      title: `Nothing references ${node.label}`,
    }));

/** Content collections with no relations at all — sometimes fine, sometimes duplicated data. */
const isolated: Check = (graph) =>
  graph.nodes
    .filter(
      (node) =>
        node.kind === "collection" &&
        !node.auth &&
        !node.upload &&
        !node.hidden &&
        !graph.edges.some((edge) => edge.source === node.id || edge.target === node.id)
    )
    .map((node) => ({
      check: "isolated",
      detail: `${node.label} has no relation fields and no other collection points to it. That is fine for standalone data (settings, logs, form submissions); if it describes the same things as another collection, it may be copying data that should be a relation.`,
      edgeIds: [],
      id: `isolated:${node.id}`,
      nodeIds: [node.id],
      severity: "info" as const,
      source: "schema" as const,
      title: `${node.label} is not connected to anything`,
    }));

/**
 * Relations without a `join` field on the target: editors opening the target document
 * cannot see what uses it. One finding per target collection.
 */
const missingJoins: Check = (graph, nodes) => {
  const joins = graph.edges.filter((edge) => edge.type === "join");
  const byTarget = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    const target = nodes.get(edge.target);
    const source = nodes.get(edge.source);
    if (
      edge.type !== "relationship" ||
      !target ||
      target.upload ||
      target.auth ||
      source?.kind !== "collection" ||
      // Joins on polymorphic or block-nested relations are limited; don't suggest them.
      edge.polymorphic ||
      edge.blocks.length > 0 ||
      isInternalField(edge)
    ) {
      continue;
    }
    const hasJoin = joins.some(
      (join) =>
        join.source === edge.target && join.target === edge.source && join.on === edge.queryPath
    );
    if (!hasJoin) {
      byTarget.set(edge.target, [...(byTarget.get(edge.target) ?? []), edge]);
    }
  }
  return [...byTarget.entries()].map(([targetId, edges]) => {
    const label = nodes.get(targetId)?.label ?? targetId;
    const fields = edges.map((edge) => fieldRef(nodes, edge));
    return {
      check: "missing-join",
      detail: `${listText(fields)} ${edges.length === 1 ? "points" : "point"} to ${label}, but ${label} has no join field for ${edges.length === 1 ? "it" : "them"}. Editors opening a document in ${label} cannot see what uses it. Add a \`join\` field if they need that.`,
      edgeIds: edges.map((edge) => edge.id),
      id: `missing-join:${targetId}`,
      nodeIds: [targetId, ...new Set(edges.map((edge) => edge.source))],
      severity: "info" as const,
      source: "schema" as const,
      title: `${label} cannot show what uses it`,
    };
  });
};

/** Block fields that share a name share a query path, so a `where` cannot tell them apart. */
const ambiguousQueryPaths: Check = (graph, nodes) => {
  const groups = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    if (isStoredRelation(edge) && edge.blocks.length > 0) {
      const key = `${edge.source}|${edge.queryPath}`;
      groups.set(key, [...(groups.get(key) ?? []), edge]);
    }
  }
  return [...groups.values()].flatMap((edges) => {
    const paths = [...new Set(edges.map((edge) => edge.path))];
    const [first] = edges;
    if (paths.length < 2 || !first) {
      return [];
    }
    const label = nodes.get(first.source)?.label ?? first.source;
    return [
      {
        check: "ambiguous-query-path",
        detail: `In ${label}, ${listText(paths)} are different block fields with the same query path \`${first.queryPath}\`. A \`where\` on \`${first.queryPath}\` matches any of these blocks, so you cannot filter by one of them alone. Give the fields distinct names if you need to.`,
        edgeIds: edges.map((edge) => edge.id),
        id: `ambiguous-query-path:${first.source}:${first.queryPath}`,
        nodeIds: [...new Set([first.source, ...edges.map((edge) => edge.target)])],
        severity: "info" as const,
        source: "schema" as const,
        title: `${label}: ${paths.length} block fields share \`${first.queryPath}\``,
      },
    ];
  });
};

/** Relations buried deep in nested blocks/arrays: hard to query, populate and keep track of. */
const deepRelations: Check = (graph, nodes) => {
  const deep = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    if (
      isStoredRelation(edge) &&
      (edge.blocks.length >= DEEP_BLOCK_LEVELS ||
        edge.queryPath.split(".").length >= DEEP_PATH_SEGMENTS)
    ) {
      const key = `${edge.source}>${edge.path}`;
      deep.set(key, [...(deep.get(key) ?? []), edge]);
    }
  }
  return [...deep.values()].flatMap((edges) => {
    const [edge] = edges;
    if (!edge) {
      return [];
    }
    const where =
      edge.blocks.length > 0
        ? `inside ${edge.blocks.length} nested block${edge.blocks.length === 1 ? "" : "s"} (${edge.blocks.join(" → ")})`
        : `${edge.queryPath.split(".").length} levels deep`;
    return [
      {
        check: "deep-relation",
        detail: `${fieldRef(nodes, edge)} sits ${where}. Relations this deep are hard to query and populate, and easy to forget when the target changes. Consider lifting it to a shallower level if it is used for filtering or listing.`,
        edgeIds: edges.map((item) => item.id),
        id: `deep-relation:${edge.source}>${edge.path}`,
        nodeIds: [...new Set([edge.source, ...edges.map((item) => item.target)])],
        severity: "info" as const,
        source: "schema" as const,
        title: `Deeply nested relation: ${fieldRef(nodes, edge)}`,
      },
    ];
  });
};

/** Polymorphic fields spanning many collections push type-switching onto every consumer. */
const widePolymorphic: Check = (graph, nodes) => {
  const fields = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    if (isStoredRelation(edge) && edge.polymorphic) {
      const key = `${edge.source}>${edge.path}`;
      fields.set(key, [...(fields.get(key) ?? []), edge]);
    }
  }
  return [...fields.values()].flatMap((edges) => {
    const [edge] = edges;
    if (!edge || edges.length < POLYMORPHIC_MAX_TARGETS) {
      return [];
    }
    const targets = edges.map((item) => nodes.get(item.target)?.label ?? item.target);
    return [
      {
        check: "wide-polymorphic",
        detail: `${fieldRef(nodes, edge)} can point to ${edges.length} collections (${listText(targets)}). Every query, access rule and frontend component reading it must handle each type. Check whether a shared collection or separate fields would be simpler.`,
        edgeIds: edges.map((item) => item.id),
        id: `wide-polymorphic:${edge.source}>${edge.path}`,
        nodeIds: [...new Set([edge.source, ...edges.map((item) => item.target)])],
        severity: "info" as const,
        source: "schema" as const,
        title: `${fieldRef(nodes, edge)} points to ${edges.length} collections`,
      },
    ];
  });
};

const CHECKS: Check[] = [
  requiredCycles,
  hubs,
  unlinkedUploads,
  isolated,
  missingJoins,
  ambiguousQueryPaths,
  deepRelations,
  widePolymorphic,
];

export const sortFindings = (findings: Finding[]): Finding[] =>
  findings.toSorted((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

/**
 * Health checks over the schema graph alone (no database): required-relation loops, hubs,
 * unlinked upload collections, isolated collections, relations without a reverse `join`,
 * ambiguous block query paths, deeply nested and widely polymorphic relations.
 * Deterministic; warnings first.
 */
export const analyzeSchema = (graph: SchemaGraph): Finding[] => {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  return sortFindings(CHECKS.flatMap((check) => check(graph, nodes)));
};
