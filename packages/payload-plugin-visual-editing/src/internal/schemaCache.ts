import type { CollectionSlug, Payload } from "payload";

import { buildFieldSchema } from "./buildFieldSchema.js";
import { filterEditableFields } from "./filterEditableFields.js";

type Schema = Record<string, unknown>;

export type SchemaCache = {
  get(slug: CollectionSlug, payload: Payload): Schema | null;
};

export type SchemaCacheOptions = {
  excludeFieldNames?: string[];
};

const DEFAULT_INTERNAL_FIELD_NAMES = ["_status", "folder", "slug"];

export const createSchemaCache = (options: SchemaCacheOptions = {}): SchemaCache => {
  const cache = new Map<string, Schema>();
  const internalFieldNames = new Set<string>([
    ...DEFAULT_INTERNAL_FIELD_NAMES,
    ...(options.excludeFieldNames ?? []),
  ]);

  return {
    get(slug, payload) {
      const cached = cache.get(slug);
      if (cached) return cached;

      const config =
        payload.collections[slug]?.config ?? payload.config.globals.find((g) => g.slug === slug);
      if (config) {
        const schema = buildFieldSchema(filterEditableFields(config.fields, internalFieldNames));
        cache.set(slug, schema);
        return schema;
      }

      return null;
    },
  };
};
