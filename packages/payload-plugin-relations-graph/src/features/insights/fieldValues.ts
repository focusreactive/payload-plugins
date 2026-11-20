import type { Where } from "payload";

import type { GraphEdge } from "../../graph/types.js";

export type RelationId = number | string;

interface PathSegment {
  /** Block slug the segment is restricted to: `sections[hero]` → `hero`. */
  block?: string;
  name: string;
}

/** `sections[hero].image` → `[{ name: "sections", block: "hero" }, { name: "image" }]`. */
export const parseDisplayPath = (path: string): PathSegment[] =>
  path.split(".").map((part) => {
    const match = /^(?<name>[^[]+)\[(?<block>[^\]]+)\]$/u.exec(part);
    return match?.groups?.name && match.groups.block
      ? { block: match.groups.block, name: match.groups.name }
      : { name: part };
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** With `locale: "all"`, a localized value comes back as `{ en: …, de: … }`. */
const isLocaleMap = (
  value: unknown,
  locales: ReadonlySet<string>
): value is Record<string, unknown> =>
  isRecord(value) &&
  locales.size > 0 &&
  Object.keys(value).length > 0 &&
  Object.keys(value).every((key) => locales.has(key));

const isId = (value: unknown): value is RelationId =>
  (typeof value === "number" && Number.isFinite(value)) ||
  (typeof value === "string" && value.length > 0);

/** One stored relation value (depth 0) → the id it points to in `targetSlug`, if any. */
const leafIds = (
  value: unknown,
  edge: GraphEdge,
  targetSlug: string,
  locales: ReadonlySet<string>
): RelationId[] => {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => leafIds(item, edge, targetSlug, locales));
  }
  if (edge.polymorphic) {
    if (isRecord(value) && "relationTo" in value) {
      if (value.relationTo !== targetSlug) {
        return [];
      }
      const inner = value.value;
      if (isId(inner)) {
        return [inner];
      }
      return isRecord(inner) && isId(inner.id) ? [inner.id] : [];
    }
    return isLocaleMap(value, locales)
      ? Object.values(value).flatMap((item) => leafIds(item, edge, targetSlug, locales))
      : [];
  }
  if (isId(value)) {
    return [value];
  }
  if (isRecord(value)) {
    if (isId(value.id)) {
      return [value.id];
    }
    if (isLocaleMap(value, locales)) {
      return Object.values(value).flatMap((item) => leafIds(item, edge, targetSlug, locales));
    }
  }
  return [];
};

const walk = (
  value: unknown,
  segments: PathSegment[],
  edge: GraphEdge,
  targetSlug: string,
  locales: ReadonlySet<string>
): RelationId[] => {
  const [segment, ...rest] = segments;
  if (!segment) {
    return leafIds(value, edge, targetSlug, locales);
  }
  if (Array.isArray(value)) {
    // Array rows or block rows sitting between two named segments.
    return value.flatMap((row) => walk(row, segments, edge, targetSlug, locales));
  }
  if (!isRecord(value)) {
    return [];
  }
  if (!(segment.name in value) && isLocaleMap(value, locales)) {
    return Object.values(value).flatMap((item) => walk(item, segments, edge, targetSlug, locales));
  }
  let child = value[segment.name];
  if (segment.block) {
    const rows = isLocaleMap(child, locales) ? Object.values(child).flat() : child;
    child = Array.isArray(rows)
      ? rows.filter((row) => isRecord(row) && row.blockType === segment.block)
      : [];
  }
  return walk(child, rest, edge, targetSlug, locales);
};

/**
 * Ids a document (read with `depth: 0`, ideally `locale: "all"`) points to through `edge`,
 * restricted to the edge's target collection. Handles groups, tabs, arrays, blocks (by
 * block type), hasMany, polymorphic `{ relationTo, value }` values and localized values.
 */
export const relationIds = (
  doc: unknown,
  edge: GraphEdge,
  targetSlug: string,
  locales: ReadonlySet<string> = new Set()
): RelationId[] => walk(doc, parseDisplayPath(edge.path), edge, targetSlug, locales);

/** First path segment — what to `select` to get the field back. */
export const topLevelField = (edge: GraphEdge): string => edge.queryPath.split(".")[0] ?? "";

/**
 * A `where` that matches exactly the source documents having this relation set — or `null`
 * when no such query is reliable and documents have to be inspected instead.
 *
 * Verified on SQLite (Drizzle) with Payload 3.90:
 * - top-level single and hasMany relationship/upload: `{ field: { exists: true } }` is exact;
 * - top-level polymorphic hasMany: `{ "field.relationTo": { equals: target } }` is exact, while
 *   `field: { exists }` throws and `"field.value": { exists }` over-counts;
 * - fields inside blocks: block fields with the same name share one query path, so the
 *   query cannot be pinned to one block type;
 * - localized fields: the query only looks at the request locale.
 * Anything nested (groups, tabs, arrays, blocks), localized or single polymorphic is
 * therefore inspected document by document.
 */
export const fillWhere = (edge: GraphEdge, targetSlug: string): Where | null => {
  if (
    edge.type === "join" ||
    edge.localized ||
    edge.blocks.length > 0 ||
    edge.queryPath.includes(".")
  ) {
    return null;
  }
  if (edge.polymorphic) {
    return edge.hasMany ? { [`${edge.queryPath}.relationTo`]: { equals: targetSlug } } : null;
  }
  return { [edge.queryPath]: { exists: true } };
};
