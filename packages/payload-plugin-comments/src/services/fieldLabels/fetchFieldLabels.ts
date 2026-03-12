"use server";

import type { CollectionSlug, Field } from "payload";
import type { BaseServiceOptions, Comment, GlobalFieldLabelRegistry } from "../../types";
import { extractPayload } from "../../utils/payload/extractPayload";
import { groupFieldPathsByDocument } from "./utils/groupFieldPathsByDocument";
import { needsDocumentFetch } from "./utils/schemaUtils";
import { resolveFieldPath } from "./utils/resolveFieldPath";

type BasePayloadCollections = Record<
  string,
  {
    config: {
      fields: Field[];
    };
  }
>;

type BaseDocumentData = Record<string, unknown>;

export async function fetchFieldLabels(
  comments: Comment[],
  options?: BaseServiceOptions,
): Promise<GlobalFieldLabelRegistry> {
  const registry: GlobalFieldLabelRegistry = {};

  const fieldPathsMap = groupFieldPathsByDocument(comments);
  if (!fieldPathsMap.size) return registry;

  const payload = await extractPayload(options?.payload);
  const collections = payload.collections as BasePayloadCollections;

  for (const [slug, fieldPathsMapByDocument] of fieldPathsMap.entries()) {
    const collectionConfig = collections[slug]?.config;
    if (!collectionConfig) continue;

    const schemaFields = collectionConfig.fields;

    for (const [documentId, fieldPathsSet] of fieldPathsMapByDocument.entries()) {
      const fieldPaths = Array.from(fieldPathsSet);
      if (!fieldPaths.length) continue;

      let docData: BaseDocumentData | null = null;

      if (needsDocumentFetch(fieldPaths, schemaFields)) {
        try {
          const doc = await payload.findByID({
            collection: slug as CollectionSlug,
            id: documentId,
            overrideAccess: true,
            depth: 5,
          });

          docData = doc as unknown as BaseDocumentData;
        } catch {}
      }

      registry[slug] ??= {};
      registry[slug][documentId] ??= {};

      const documentRegistry = registry[slug][documentId];

      for (const fieldPath of fieldPaths) {
        if (!fieldPath) continue;

        documentRegistry[fieldPath] = resolveFieldPath(fieldPath.split("."), schemaFields, docData);
      }
    }
  }

  return registry;
}
