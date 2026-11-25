import type { CollectionSlug, PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/http/ServerResponse.js";
import { NOT_FOUND } from "../../shared/http/readRefusals.js";
import { fetchDocumentLocale } from "../../shared/payload/documentLocale.js";
import { latestOf } from "../../shared/payload/worldOfCollection.js";

export type ReadableDocument =
  | { readable: true; document: Record<string, unknown> }
  | { readable: false; refusal: Response };

export async function requireReadableDocument(question: {
  req: PayloadRequest;
  collection: CollectionSlug;
  id: string;
  sourceLocale: string;
}): Promise<ReadableDocument> {
  const { req, collection, id, sourceLocale } = question;
  const document = await fetchDocumentLocale({
    payload: req.payload,
    collection,
    id,
    locale: sourceLocale,
    read: latestOf(req.payload, collection),
    user: req.user,
  });

  if (!document) return { readable: false, refusal: ServerResponse.notFound(NOT_FOUND) };
  return { readable: true, document: document as Record<string, unknown> };
}
