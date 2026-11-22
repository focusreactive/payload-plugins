import type { CollectionSlug, Payload, Where } from "payload";

import type { DocumentId, LocaleCode } from "../../../types/wire/primitives.js";

import type { RequestScope } from "./RequestScope.shapes.js";
import { freshReq } from "./RequestScope.shapes.js";
import type { VersionRead } from "./worldOfCollection.js";

/**
 * Payload answers 400 when a `where` names a field the caller may not read, and this `where` names
 * every translatable field.
 */
const ON_DOCUMENTS_ALREADY_GRANTED = { overrideAccess: true } as const;

export type TranslatableFieldPath = string;

export type LocaleContentQuery = {
  payload: Payload;
  collection: CollectionSlug;
  grantedIds: readonly DocumentId[];
  locales: readonly LocaleCode[];
  paths: readonly TranslatableFieldPath[];
  read: VersionRead;
  scope?: RequestScope;
};

export type DocumentsHoldingContent = ReadonlyMap<LocaleCode, ReadonlySet<DocumentId>>;

const holdingAnything = (
  grantedIds: readonly DocumentId[],
  paths: readonly TranslatableFieldPath[]
): Where => ({
  and: [
    { id: { in: [...grantedIds] } },
    { or: paths.map((path) => ({ [path]: { exists: true } })) },
  ],
});

export async function localesHoldingContent(
  query: LocaleContentQuery
): Promise<DocumentsHoldingContent> {
  const { payload, collection, grantedIds, locales, paths, read, scope } = query;
  if (paths.length === 0 || grantedIds.length === 0) return new Map();

  const answers = await Promise.all(
    locales.map(async (locale) => {
      const found = await payload.find({
        req: freshReq(scope ?? {}),
        collection,
        locale,
        depth: 0,
        pagination: false,
        select: { id: true },
        where: holdingAnything(grantedIds, paths),
        ...ON_DOCUMENTS_ALREADY_GRANTED,
        ...read,
      });
      const held: ReadonlySet<DocumentId> = new Set(found.docs.map((doc) => String(doc.id)));
      return [locale, held] as const;
    })
  );

  return new Map(answers);
}
