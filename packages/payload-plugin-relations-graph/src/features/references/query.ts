import type { Where } from "payload";

import type { GraphEdge, GraphNode, SchemaGraph } from "../../graph/types.js";

/**
 * Pure building blocks of the "where is this used?" lookup: which fields to check, the `where`
 * clause for each, and how to find a reference inside a loaded document. No Payload calls here.
 */

/** A field that can be found with a `where` query on its source collection. */
export interface QueryLookup {
  edge: GraphEdge;
  source: GraphNode;
  where: Where;
}

/**
 * Fields that have to be found by loading documents and reading the value: everything in a
 * global (globals cannot be queried) and, in collections, everything inside blocks — Payload's
 * SQL adapters resolve `layout.field` to the first block that has a field of that name, return
 * nothing for hasMany relations in later blocks and throw for blocks nested in blocks.
 */
export interface ScanLookup {
  edges: GraphEdge[];
  source: GraphNode;
}

export interface ReferenceLookupPlan {
  queries: QueryLookup[];
  scans: ScanLookup[];
}

export interface PathSegment {
  name: string;
  /** Set when the segment is a blocks field: only rows of this block type are followed. */
  block?: string;
}

/** Incoming edges that store data (joins are virtual), with their source node. */
export const getIncomingEdges = (
  graph: SchemaGraph,
  targetSlug: string
): { edge: GraphEdge; source: GraphNode }[] => {
  const target = `collection:${targetSlug}`;
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const result: { edge: GraphEdge; source: GraphNode }[] = [];
  for (const edge of graph.edges) {
    const source = nodes.get(edge.source);
    if (edge.target === target && edge.type !== "join" && source) {
      result.push({ edge, source });
    }
  }
  return result;
};

/**
 * `where` clause matching documents whose field points at `id`. Works the same for single and
 * hasMany fields (`equals` matches any item of a hasMany relation). Polymorphic fields store
 * `{ relationTo, value }`, so the collection is part of the match — otherwise an id that exists
 * in two collections would match both.
 */
export const buildReferenceWhere = (
  edge: Pick<GraphEdge, "polymorphic" | "queryPath">,
  targetSlug: string,
  id: number | string
): Where => ({
  [edge.queryPath]: {
    equals: edge.polymorphic ? { relationTo: targetSlug, value: id } : id,
  },
});

export const planReferenceLookups = (
  graph: SchemaGraph,
  targetSlug: string,
  id: number | string
): ReferenceLookupPlan => {
  const queries: QueryLookup[] = [];
  const scans = new Map<string, ScanLookup>();

  for (const { edge, source } of getIncomingEdges(graph, targetSlug)) {
    if (source.kind === "global" || edge.blocks.length > 0) {
      const scan = scans.get(source.id) ?? { edges: [], source };
      scan.edges.push(edge);
      scans.set(source.id, scan);
    } else {
      queries.push({ edge, source, where: buildReferenceWhere(edge, targetSlug, id) });
    }
  }

  return { queries, scans: [...scans.values()] };
};

/** `sections[content].items.link` → `[{ name: "sections", block: "content" }, …]`. */
export const parseFieldPath = (path: string): PathSegment[] =>
  path.split(".").map((part) => {
    const match = /^(?<name>[^[\]]+)\[(?<block>[^[\]]+)\]$/u.exec(part);
    return match?.groups
      ? { block: match.groups.block, name: match.groups.name as string }
      : { name: part };
  });

/** Top-level data field a path starts in — what to `select` when loading documents for a scan. */
export const rootFieldName = (path: string): string => parseFieldPath(path)[0]?.name ?? path;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * With `locale: "all"` a localized field holds `{ en: …, de: … }` instead of its value. Any plain
 * object whose keys are all locale codes is treated as such a map.
 */
const isLocaleMap = (value: unknown, localeCodes: ReadonlySet<string>): boolean => {
  if (!isRecord(value) || localeCodes.size === 0) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => localeCodes.has(key));
};

const expand = (value: unknown, localeCodes: ReadonlySet<string>): unknown[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => expand(item, localeCodes));
  }
  if (isLocaleMap(value, localeCodes)) {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      expand(item, localeCodes)
    );
  }
  return value === undefined || value === null ? [] : [value];
};

/** Every value stored at `segments` in `doc`, through arrays, blocks of the right type and locales. */
export const collectValues = (
  doc: unknown,
  segments: PathSegment[],
  localeCodes: ReadonlySet<string> = new Set()
): unknown[] => {
  let current = expand(doc, localeCodes);
  for (const segment of segments) {
    const next: unknown[] = [];
    for (const item of current) {
      if (!isRecord(item)) {
        continue;
      }
      let values = expand(item[segment.name], localeCodes);
      if (segment.block) {
        values = values.filter((row) => isRecord(row) && row.blockType === segment.block);
      }
      next.push(...values);
    }
    current = next;
  }
  return current;
};

const sameId = (a: unknown, b: number | string): boolean =>
  (typeof a === "string" || typeof a === "number") && String(a) === String(b);

/** Does a stored relation value (id, populated doc or `{ relationTo, value }`) point at the target? */
export const isReferenceTo = (
  value: unknown,
  targetSlug: string,
  id: number | string,
  polymorphic: boolean
): boolean => {
  if (polymorphic) {
    if (!isRecord(value) || value.relationTo !== targetSlug) {
      return false;
    }
    const inner = value.value;
    return sameId(inner, id) || (isRecord(inner) && sameId(inner.id, id));
  }
  return sameId(value, id) || (isRecord(value) && sameId(value.id, id));
};

/** Whether `doc` references the target through the field described by `edge`. */
export const docReferences = (
  doc: unknown,
  edge: Pick<GraphEdge, "path" | "polymorphic">,
  targetSlug: string,
  id: number | string,
  localeCodes: ReadonlySet<string> = new Set()
): boolean =>
  collectValues(doc, parseFieldPath(edge.path), localeCodes).some((value) =>
    isReferenceTo(value, targetSlug, id, edge.polymorphic)
  );

/** A readable title from a (possibly localized) `useAsTitle` value. */
export const pickTitle = (
  value: unknown,
  fallback: string,
  preferredLocales: string[] = []
): string => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (isRecord(value)) {
    for (const locale of preferredLocales) {
      const candidate = value[locale];
      if (typeof candidate === "string" && candidate.length > 0) {
        return candidate;
      }
    }
    for (const candidate of Object.values(value)) {
      if (typeof candidate === "string" && candidate.length > 0) {
        return candidate;
      }
    }
  }
  return fallback;
};

export interface VariantResult {
  /** The query ran against the latest drafts rather than the published documents. */
  draft: boolean;
  totalDocs: number;
  docs: { id: number | string; title: string }[];
}

/**
 * Merge the results of querying one field per locale and/or draft state. Totals are exact when
 * no variant was truncated (union of ids), otherwise the largest single total — a lower bound.
 */
export const mergeVariants = (
  variants: VariantResult[],
  limit: number
): {
  approximate: boolean;
  docs: { draftOnly?: boolean; id: number | string; title: string }[];
  totalDocs: number;
} => {
  const truncated = variants.some((variant) => variant.totalDocs > variant.docs.length);
  const publishedTruncated = variants.some(
    (variant) => !variant.draft && variant.totalDocs > variant.docs.length
  );
  const hasPublished = variants.some((variant) => !variant.draft);
  const published = new Set<string>();
  for (const variant of variants) {
    if (!variant.draft) {
      for (const doc of variant.docs) {
        published.add(String(doc.id));
      }
    }
  }

  const merged = new Map<string, { draftOnly?: boolean; id: number | string; title: string }>();
  for (const variant of variants) {
    for (const doc of variant.docs) {
      const key = String(doc.id);
      if (merged.has(key)) {
        continue;
      }
      const draftOnly = variant.draft && hasPublished && !publishedTruncated && !published.has(key);
      merged.set(key, draftOnly ? { ...doc, draftOnly } : { ...doc });
    }
  }

  const docs = [...merged.values()];
  const maxTotal = Math.max(0, ...variants.map((variant) => variant.totalDocs));
  return {
    approximate: truncated && variants.length > 1,
    docs: docs.slice(0, limit),
    totalDocs: truncated ? Math.max(maxTotal, docs.length) : docs.length,
  };
};
