import type { CollectionSlug, Payload } from "payload";

import { PACKAGE_NAME } from "../shared/packageName.js";
import { buildEditableSchema } from "../shared/editableSchema/editableSchema.js";
import type { EditableSchema, SchemaField } from "../shared/editableSchema/editableSchema.js";
import type { ReferencedBlocks } from "../shared/editableSchema/schemaOfFields.js";
import { isPlainObject } from "../shared/plainObject.js";

type CustomConfig = Record<string, unknown> | undefined;

const SCHEMA_CACHE_KEY = `${PACKAGE_NAME}/schemaCache`;

type FieldsOfEntity = { fields: readonly SchemaField[]; slug: string };

export type SchemaSource = {
  blocks: ReferencedBlocks;
  collections: Readonly<Record<string, { config: FieldsOfEntity } | undefined>>;
  config: { globals: readonly FieldsOfEntity[] };
};

export type SchemaCache = {
  get(slug: CollectionSlug, source: SchemaSource): EditableSchema | null;
};

export type SchemaCacheOptions = {
  excludeFieldNames?: string[];
};

export const createSchemaCache = (options: SchemaCacheOptions = {}): SchemaCache => {
  const cache = new Map<string, EditableSchema>();

  return {
    get(slug, source) {
      const cached = cache.get(slug);
      if (cached) return cached;

      const config =
        source.collections[slug]?.config ?? source.config.globals.find((g) => g.slug === slug);
      if (config) {
        const schema = buildEditableSchema(config.fields, {
          excludeFieldNames: options.excludeFieldNames,
          referencedBlocks: source.blocks,
        });
        cache.set(slug, schema);
        return schema;
      }

      return null;
    },
  };
};

export const withSchemaCache = (custom: CustomConfig, schemaCache: SchemaCache) => ({
  ...custom,
  [SCHEMA_CACHE_KEY]: schemaCache,
});

const isSchemaCache = (value: unknown): value is SchemaCache =>
  isPlainObject(value) && typeof value.get === "function";

export const schemaCacheOf = (payload: Payload): SchemaCache | null => {
  const custom: CustomConfig = payload.config.custom;
  const schemaCache = custom?.[SCHEMA_CACHE_KEY];
  return isSchemaCache(schemaCache) ? schemaCache : null;
};
