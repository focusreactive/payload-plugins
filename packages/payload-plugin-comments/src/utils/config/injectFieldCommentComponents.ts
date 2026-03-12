import type { CollectionAfterDeleteHook, CollectionConfig, Field } from "payload";
import { getComponentConfig } from "../path/getComponentPath";
import { DEFAULT_COLLECTION_SLUG } from "../../constants";

type BaseField = Field & {
  name?: string | null | undefined;
};

const LABELED_FIELD_TYPES = new Set([
  "text",
  "number",
  "email",
  "textarea",
  "code",
  "date",
  "upload",
  "relationship",
  "select",
  "radio",
  "checkbox",
  "richText",
  "point",
  "json",
  "array",
  "group",
  "blocks",
]);

function buildPath(parentPath: string, segment: string): string {
  return parentPath ? `${parentPath}.${segment}` : segment;
}

function injectIntoField(field: Field, parentPath: string): Field {
  if (field.type === "ui") return field;

  const f = field as BaseField;

  const { name } = f;
  const currentPath = name ? buildPath(parentPath, name) : parentPath;

  let result: any = { ...f };

  if (Array.isArray(result.fields)) {
    result = { ...result, fields: injectIntoFields(result.fields, currentPath) };
  }

  if (result.type === "tabs" && Array.isArray(result.tabs)) {
    result = {
      ...result,
      tabs: result.tabs.map((tab: { name?: string; fields: Field[] }) => ({
        ...tab,
        fields: injectIntoFields(tab.fields, tab.name ? buildPath(currentPath, tab.name) : currentPath),
      })),
    };
  }

  if (result.type === "blocks" && Array.isArray(result.blocks)) {
    result = {
      ...result,
      blocks: result.blocks.map((block: { fields: Field[] }) => ({
        ...block,
        fields: injectIntoFields(block.fields, currentPath),
      })),
    };
  }

  if (name && LABELED_FIELD_TYPES.has(result.type) && !result.admin?.components?.Label) {
    result = {
      ...result,
      admin: {
        ...result.admin,
        components: {
          ...result.admin?.components,
          Label: getComponentConfig({
            componentPath: "components/FieldCommentLabel",
            componentName: "FieldCommentLabel",
          }),
        },
      },
    };
  }

  return result as Field;
}

function injectIntoFields(fields: Field[], parentPath: string): Field[] {
  return fields.map((field) => injectIntoField(field, parentPath));
}

export function injectFieldCommentComponents(collection: CollectionConfig): CollectionConfig {
  if (collection.slug === DEFAULT_COLLECTION_SLUG) {
    return collection;
  }

  return {
    ...collection,
    fields: injectIntoFields(collection.fields, ""),
    hooks: {
      ...collection.hooks,
      afterDelete: [
        ...(collection.hooks?.afterDelete ?? []),
        (async ({ doc, req }) => {
          await req.payload.delete({
            collection: DEFAULT_COLLECTION_SLUG,
            where: {
              and: [{ collectionSlug: { equals: collection.slug } }, { documentId: { equals: Number(doc.id) } }],
            },
            req,
            overrideAccess: true,
          });
        }) satisfies CollectionAfterDeleteHook,
      ],
    },
  };
}
