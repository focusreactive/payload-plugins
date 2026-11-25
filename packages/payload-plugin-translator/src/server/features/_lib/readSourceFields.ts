import type { CollectionSlug, PayloadRequest } from "payload";

import type { FieldFingerprints } from "../../../core/domain/content-projection/computeFieldFingerprints.js";
import type { SourceFingerprinter } from "../../../core/domain/content-projection/sourceFingerprinter.js";
import { fetchDocumentLocale } from "../../shared/payload/documentLocale.js";

/**
 * A source locale's per-leaf fingerprints as the caller may read them now; `null`, and a logged
 * warning, where the read produced nothing.
 */
export async function readSourceFields(question: {
  req: PayloadRequest;
  collection: CollectionSlug;
  id: string;
  locale: string;
  fingerprintOf: SourceFingerprinter;
}): Promise<FieldFingerprints | null> {
  const { req, collection, id, locale, fingerprintOf } = question;
  const document = await fetchDocumentLocale({
    payload: req.payload,
    collection,
    id,
    locale,
    user: req.user,
  });
  if (document) return fingerprintOf(collection, document) ?? {};

  req.payload.logger.warn({
    collection,
    documentId: id,
    sourceLocale: locale,
    msg: "translator: a translation's source locale cannot be read; its fields read as unanswered",
  });
  return null;
}
