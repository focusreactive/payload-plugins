import type { CollectionSlug, Payload, Where } from "payload";

import type { DocumentId, LocaleCode } from "../../../types/wire/primitives.js";

import type { RequestScope } from "./RequestScope.shapes.js";
import { freshReq } from "./RequestScope.shapes.js";

const CURRENT_VERSION_OF_THIS_LOCALE_ONLY = { draft: true, fallbackLocale: false } as const;

/**
 * Also required, not merely redundant: this query's `where` names every translatable field, and
 * Payload answers 400 when a `where` names a field the caller may not read.
 */
const ON_DOCUMENTS_ALREADY_GRANTED = { overrideAccess: true } as const;

export type LocaleContentQuery = {
  payload: Payload;
  collection: CollectionSlug;
  /** The documents to ask about, each already past the decision that it may be seen. */
  ids: readonly DocumentId[];
  locales: readonly LocaleCode[];
  /** The field paths a value may sit at, as `translatableFieldPaths` spells them. */
  paths: readonly string[];
  scope?: RequestScope;
};

/** Which of these documents hold anything translatable, per locale. */
export type ContentByLocale = ReadonlyMap<LocaleCode, ReadonlySet<DocumentId>>;

const holdingAnything = (ids: readonly DocumentId[], paths: readonly string[]): Where => ({
  and: [{ id: { in: [...ids] } }, { or: paths.map((path) => ({ [path]: { exists: true } })) }],
});

export async function localesHoldingContent(query: LocaleContentQuery): Promise<ContentByLocale> {
  const { payload, collection, ids, locales, paths, scope } = query;
  if (paths.length === 0 || ids.length === 0) return new Map();

  const answers = await Promise.all(
    locales.map(async (locale) => {
      const found = await payload.find({
        req: freshReq(scope ?? {}),
        collection,
        locale,
        depth: 0,
        pagination: false,
        select: { id: true },
        where: holdingAnything(ids, paths),
        ...ON_DOCUMENTS_ALREADY_GRANTED,
        ...CURRENT_VERSION_OF_THIS_LOCALE_ONLY,
      });
      const held: ReadonlySet<DocumentId> = new Set(found.docs.map((doc) => String(doc.id)));
      return [locale, held] as const;
    })
  );

  return new Map(answers);
}
