"use server";

import type { CollectionSlug, Field } from "payload";

import type {
  BaseServiceOptions,
  Comment,
  GlobalFieldLabelRegistry,
} from "../../types";
import { extractPayload } from "../../utils/payload/extractPayload";
import { groupFieldPathsByDocument } from "./utils/groupFieldPathsByDocument";
import { resolveFieldPath } from "./utils/resolveFieldPath";
import { needsDocumentFetch } from "./utils/schemaUtils";

type BasePayloadCollections = Record<
  string,
  {
    config: {
      fields: Field[];
    };
  }
>;

type BaseGlobals = Record<string, { config: { fields: Field[] } }>;

type BaseDocumentData = Record<string, unknown>;

export async function fetchFieldLabels(
  comments: Comment[],
  options?: BaseServiceOptions
): Promise<GlobalFieldLabelRegistry> {
  const registry: GlobalFieldLabelRegistry = {};

  const payload = await extractPayload(options?.payload);

  // --- Collections branch ---
  const fieldPathsMap = groupFieldPathsByDocument(comments);
  const collections = payload.collections as BasePayloadCollections;

  for (const [slug, fieldPathsMapByDocument] of fieldPathsMap.entries()) {
    const collectionConfig = collections[slug]?.config;
    if (!collectionConfig) {continue;}

    const schemaFields = collectionConfig.fields;

    for (const [
      documentId,
      fieldPathsSet,
    ] of fieldPathsMapByDocument.entries()) {
      const fieldPaths = [...fieldPathsSet];
      if (!fieldPaths.length) {continue;}

      let docData: BaseDocumentData | null = null;

      if (needsDocumentFetch(fieldPaths, schemaFields)) {
        try {
          const doc = await payload.findByID({
            collection: slug as CollectionSlug,
            depth: 5,
            id: documentId,
            overrideAccess: true,
          });

          docData = doc as unknown as BaseDocumentData;
        } catch {}
      }

      registry[slug] ??= {};
      registry[slug][documentId] ??= {};

      const documentRegistry = registry[slug][documentId];

      for (const fieldPath of fieldPaths) {
        if (!fieldPath) {continue;}

        documentRegistry[fieldPath] = resolveFieldPath(
          fieldPath.split("."),
          schemaFields,
          docData
        );
      }
    }
  }

  // --- Globals branch ---
  const globalFieldPathsMap = new Map<string, Set<string>>();

  for (const { globalSlug, fieldPath } of comments) {
    if (!globalSlug || !fieldPath) {continue;}
    if (!globalFieldPathsMap.has(globalSlug))
      {globalFieldPathsMap.set(globalSlug, new Set());}
    globalFieldPathsMap.get(globalSlug)!.add(fieldPath);
  }

  const globals = (payload as any).globals as BaseGlobals;

  for (const [slug, fieldPathsSet] of globalFieldPathsMap.entries()) {
    const globalConfig = globals?.[slug]?.config;
    if (!globalConfig) {continue;}

    const schemaFields = globalConfig.fields;
    const fieldPaths = [...fieldPathsSet];
    if (!fieldPaths.length) {continue;}

    let docData: BaseDocumentData | null = null;

    if (needsDocumentFetch(fieldPaths, schemaFields)) {
      try {
        const doc = await payload.findGlobal({
          depth: 5,
          overrideAccess: true,
          slug,
        });
        docData = doc as unknown as BaseDocumentData;
      } catch {}
    }

    // Use globalSlug as the first key and sentinel 0 as documentId
    registry[slug] ??= {};
    registry[slug][0] ??= {};

    const documentRegistry = registry[slug][0];

    for (const fieldPath of fieldPaths) {
      if (!fieldPath) {continue;}
      documentRegistry[fieldPath] = resolveFieldPath(
        fieldPath.split("."),
        schemaFields,
        docData
      );
    }
  }

  return registry;
}
