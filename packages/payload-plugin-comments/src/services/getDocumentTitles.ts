"use server";

import type { CollectionSlug } from "payload";

import type {
  Response,
  Comment,
  BaseDocument,
  DocumentTitles,
  BaseServiceOptions,
} from "../types";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { extractPayload } from "../utils/payload/extractPayload";

function buildDocumentTitlesFromDocs(
  docs: BaseDocument[],
  titleField: string
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const doc of docs) {
    const key = String(doc.id);

    result[key] = String(doc[titleField]);
  }

  return result;
}

export async function getDocumentTitles(
  comments: Comment[],
  documentTitleFields: Record<string, string>,
  options?: BaseServiceOptions
): Promise<Response<DocumentTitles>> {
  try {
    const payload = await extractPayload(options?.payload);

    const documentIdsMap = new Map<string, Set<number>>();

    for (const { collectionSlug, documentId } of comments) {
      if (!collectionSlug || documentId == null) {continue;}

      if (!documentIdsMap.has(collectionSlug)) {
        documentIdsMap.set(collectionSlug, new Set());
      }

      documentIdsMap.get(collectionSlug)!.add(documentId);
    }

    const documentTitles: DocumentTitles = {};

    await Promise.all(
      [...documentIdsMap.entries()].map(async ([slug, ids]) => {
        const titleField = documentTitleFields[slug] ?? "id";

        try {
          const { docs } = await payload.find({
            collection: slug as CollectionSlug,
            depth: 0,
            limit: ids.size,
            locale: options?.locale,
            overrideAccess: true,
            where: {
              id: {
                in: [...ids],
              },
            },
          });

          documentTitles[slug] = buildDocumentTitlesFromDocs(
            docs as unknown as BaseDocument[],
            titleField
          );
        } catch {
          documentTitles[slug] = Object.fromEntries(
            [...ids].map((id) => [String(id), String(id)])
          );
        }
      })
    );

    return {
      data: documentTitles,
      success: true,
    };
  } catch (error) {
    console.error(`Failed to fetch document titles`, error);

    return {
      success: false,
      error: getDefaultErrorMessage(error),
    };
  }
}
