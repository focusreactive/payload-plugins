import type { CollectionSlug } from "payload";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import type { Response, Comment, BaseDocument, DocumentTitles, ServiceContext } from "../types";

export interface GetDocumentTitlesArgs {
  comments: Comment[];
  documentTitleFields: Record<string, string>;
  locale?: string | null;
}

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
  { payload }: ServiceContext,
  { comments, documentTitleFields, locale }: GetDocumentTitlesArgs
): Promise<Response<DocumentTitles>> {
  try {
    const documentIdsMap = new Map<string, Set<number>>();

    for (const { collectionSlug, documentId } of comments) {
      if (!collectionSlug || documentId == null) continue;

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
            where: {
              id: {
                in: [...ids],
              },
            },
            limit: ids.size,
            depth: 0,
            overrideAccess: true,
            locale,
          });

          documentTitles[slug] = buildDocumentTitlesFromDocs(
            docs as unknown as BaseDocument[],
            titleField
          );
        } catch {
          documentTitles[slug] = Object.fromEntries([...ids].map((id) => [String(id), String(id)]));
        }
      })
    );

    return {
      success: true,
      data: documentTitles,
    };
  } catch (e) {
    console.error(`Failed to fetch document titles`, e);

    return {
      success: false,
      error: getDefaultErrorMessage(e),
    };
  }
}
