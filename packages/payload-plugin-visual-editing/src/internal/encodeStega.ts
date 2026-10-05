import type { CollectionSlug } from "payload";

import { vercelStegaCombine } from "@vercel/stega";

import type { ValueExcludePredicate } from "../excludeValues.js";

import { markTerminalUploads } from "./markTerminalUploads.js";
import {
  isMetaInfo,
  isPlainObject,
  META_KEY,
  ROOT_ARRAY_TOKEN,
  toMetaInfo,
  toStegaPayload,
} from "./shared.js";
import type { MetaInfo, PlainObject } from "./shared.js";

type SchemaNode = string | PlainObject;
type ResolveSchema = (slug: CollectionSlug) => SchemaNode | null;

type Holder = { object: PlainObject; meta: MetaInfo };

const RELATION_SCHEMA_PATTERN = /^(?:relationship|upload):(.+)$/;

export const encodeStega = <T>(
  data: T,
  resolveSchema: ResolveSchema,
  excludeValues: readonly ValueExcludePredicate[] = []
): T => {
  markTerminalUploads(data, resolveSchema);

  const holders: Holder[] = [];
  collectHolders(data, holders);

  for (const holder of holders) {
    applyHolder(holder, resolveSchema, data, excludeValues);
  }

  return data;
};

const collectHolders = (value: unknown, out: Holder[]): void => {
  if (Array.isArray(value)) {
    for (const item of value) collectHolders(item, out);
    return;
  }
  if (!isPlainObject(value)) return;

  for (const key in value) {
    if (key === META_KEY) continue;
    collectHolders(value[key], out);
  }

  const meta = value[META_KEY];
  if (isMetaInfo(meta) && meta.terminal !== true) {
    out.push({ object: value, meta });
  }
};

// `rootData` is the whole document tree. Schema walks need it to read numeric
// blocks-array discriminators (`blockType`) and polymorphic relation targets —
// using the holder's own inner object as data would fail on any path that
// crosses a blocks array or an array row.
const applyHolder = (
  holder: Holder,
  resolveSchema: ResolveSchema,
  rootData: unknown,
  excludeValues: readonly ValueExcludePredicate[]
): void => {
  const rootSchema = resolveSchema(holder.meta.collectionSlug);
  if (rootSchema === null) {
    delete holder.object[META_KEY];
    return;
  }

  const object = holder.object;
  let segments = pathToSegments(holder.meta.path);

  while (true) {
    const schema = resolveSchemaAtPath(rootSchema, rootData, segments, resolveSchema);
    if (schema !== null) {
      const pathStr = segmentsToPath(segments);

      // Terminal leaf renderer (e.g. richText). The holder object the enricher
      // attached _meta to is often a descendant (e.g. `content.root` inside
      // `content` whose schema is 'richText'), but renderers call
      // `withVisualEditingPath(content)` — they only look at the CONTAINER's
      // `_meta`. Promote the terminal marker to the container at the resolved
      // path, and clear the holder's own _meta so it doesn't leak into the UI.
      if (typeof schema === "string" && !TEXT_FIELD_TYPES.has(schema)) {
        delete object[META_KEY];
        const container = getDataAtPath(rootData, segments);
        if (isPlainObject(container)) {
          container[META_KEY] = toMetaInfo({ ...holder.meta, path: pathStr }, { terminal: true });
        }
        return;
      }

      const textKeys = getTextKeys(schema);
      if (textKeys.length > 0) {
        const payload = toStegaPayload({ ...holder.meta, path: pathStr });
        let embedded = false;
        for (const key of textKeys) {
          const current = object[key];
          if (typeof current !== "string") continue;
          if (current.trim() === "") continue;
          if (excludeValues.some((match) => match(current))) continue;
          const keyPath = pathStr ? `${pathStr}.${key}` : key;
          // `false` disables @vercel/stega's auto-skip heuristic (URL- AND Date.parse-based).
          // We run our own value-shape filter via `excludeValues` above, so vercel's extra
          // guard would only cause false negatives — notoriously including `"80%"`, which
          // V8's Date.parse parses as year 1980.
          object[key] = vercelStegaCombine(current, { ...payload, path: keyPath }, false);
          embedded = true;
        }
        if (embedded) {
          delete object[META_KEY];
          return;
        }
      }
    }

    if (segments.length === 0) {
      delete object[META_KEY];
      return;
    }

    segments = segments.slice(0, -1);
  }
};

const resolveSchemaAtPath = (
  rootSchema: SchemaNode,
  rootData: unknown,
  segments: readonly string[],
  resolveSchema: ResolveSchema
): SchemaNode | null => {
  let schema: SchemaNode = rootSchema;
  let data: unknown = rootData;

  for (const segment of segments) {
    if (segment === ROOT_ARRAY_TOKEN) continue;

    if (typeof schema === "string") {
      const unwrapped = unwrapRelationSchema(schema, data, resolveSchema);
      if (unwrapped === null) return null;
      schema = unwrapped;
    }

    if (isNumericSegment(segment)) {
      if (!Array.isArray(data)) return null;
      data = data[Number(segment)];
      if (
        isPlainObject(schema) &&
        isPlainObject(data) &&
        typeof data.blockType === "string" &&
        data.blockType in schema
      ) {
        schema = schema[data.blockType] as SchemaNode;
      }
      continue;
    }

    if (!isPlainObject(schema)) return null;
    if (!(segment in schema)) return null;
    schema = schema[segment] as SchemaNode;
    data = isPlainObject(data) && segment in data ? data[segment] : undefined;
  }

  return schema;
};

const unwrapRelationSchema = (
  schema: SchemaNode,
  data: unknown,
  resolveSchema: ResolveSchema
): SchemaNode | null => {
  if (typeof schema !== "string") return schema;
  const match = RELATION_SCHEMA_PATTERN.exec(schema);
  if (!match) return schema;

  const targets = match[1]!.split("|");
  let slug: string | undefined;
  if (targets.length === 1) {
    slug = targets[0];
  } else if (
    isPlainObject(data) &&
    typeof data.relationTo === "string" &&
    targets.includes(data.relationTo)
  ) {
    slug = data.relationTo;
  }
  if (!slug) return null;
  return resolveSchema(slug as CollectionSlug);
};

// Plain-string field types that render as free-text prose and tolerate stega
// zero-width chars. `code`/`date` would be corrupted; others aren't free text.
const TEXT_FIELD_TYPES = new Set(["text", "textarea", "email"]);

const getTextKeys = (schema: SchemaNode): string[] => {
  if (!isPlainObject(schema)) return [];
  return Object.keys(schema).filter((k) => TEXT_FIELD_TYPES.has(schema[k] as string));
};

const getDataAtPath = (rootData: unknown, segments: readonly string[]): unknown => {
  let cursor: unknown = rootData;
  for (const segment of segments) {
    if (segment === ROOT_ARRAY_TOKEN) continue;
    if (isNumericSegment(segment)) {
      if (!Array.isArray(cursor)) return null;
      cursor = cursor[Number(segment)];
      continue;
    }
    if (!isPlainObject(cursor)) return null;
    cursor = cursor[segment];
  }
  return cursor;
};

const isNumericSegment = (s: string): boolean => /^\d+$/.test(s);
const pathToSegments = (path: string): string[] => path.split(".").filter((s) => s.length > 0);
const segmentsToPath = (segments: readonly string[]): string => segments.join(".");
