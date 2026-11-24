import type { CollectionSlug, Payload } from "payload";

import type { TranslatableTextPresence } from "../../../core/domain/content-projection/holdsTranslatableText.js";
import type { DocumentId, LocaleCode } from "../../../types/wire/primitives.js";

import type { RequestScope } from "./RequestScope.shapes.js";
import { freshReq } from "./RequestScope.shapes.js";
import type { VersionRead } from "./worldOfCollection.js";

/**
 * The values are read past the host's field rules and never leave this function — only the set of
 * document ids does. A caller who may not read a field must still be told that the locale holds
 * something, or the same locale would read as empty for one editor and filled for another.
 */
const ON_DOCUMENTS_ALREADY_GRANTED = { overrideAccess: true } as const;

export type LocaleContentQuery = {
  payload: Payload;
  collection: CollectionSlug;
  grantedIds: readonly DocumentId[];
  locales: readonly LocaleCode[];
  holdsText: TranslatableTextPresence;
  read: VersionRead;
  scope?: RequestScope;
};

export type DocumentsHoldingContent = ReadonlyMap<LocaleCode, ReadonlySet<DocumentId>>;

/**
 * Which of these documents hold translatable text in each locale.
 *
 * Asked of the documents rather than of the database: there is no way to ask Payload whether a
 * locale holds anything, and assembling the question out of one condition per translatable field
 * fails outright once two of those fields sit in the same block — the adapter joins that block's
 * table twice under one alias.
 */
export async function localesHoldingContent(
  query: LocaleContentQuery
): Promise<DocumentsHoldingContent> {
  const { payload, collection, grantedIds, locales, holdsText, read, scope } = query;
  if (grantedIds.length === 0) return new Map();

  const answers = await Promise.all(
    locales.map(async (locale) => {
      const found = await payload.find({
        req: freshReq(scope ?? {}),
        collection,
        locale,
        depth: 0,
        pagination: false,
        where: { id: { in: [...grantedIds] } },
        ...ON_DOCUMENTS_ALREADY_GRANTED,
        ...read,
      });
      const held: ReadonlySet<DocumentId> = new Set(
        found.docs
          .filter((doc) => holdsText(collection, doc as Record<string, unknown>))
          .map((doc) => String(doc.id))
      );
      return [locale, held] as const;
    })
  );

  return new Map(answers);
}
