import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../../../../../server/shared/index.js";
import { fetchDocumentLocale } from "../../../../../../server/shared/payload/documentLocale.js";
import { latestOf } from "../../../../../../server/shared/payload/worldOfCollection.js";
import type { RouteHandler } from "../../../../../../server/shared/http/withErrorHandler.js";
import { GetDocumentStatusInputSchema } from "../../../../../../server/features/get-document-status/model.js";
import { GetCollectionStatusInputSchema } from "../../../../../../server/features/get-collection-status/model.js";
import type { DocumentTranslationState } from "../../../../../../types/wire/DocumentTranslationState.js";
import type { ListTranslationState } from "../../../../../../types/wire/ListTranslationState.js";
import type { DocumentId } from "../../../../../../types/wire/primitives.js";

import { localesOf } from "./localesOf.js";
import { NOT_MANAGED, NO_LOCALIZATION } from "../../../../../../server/shared/http/readRefusals.js";
import type { StubDeps } from "./StubDeps.js";

const idsAsked = (req: PayloadRequest): DocumentId[] =>
  (req.searchParams.get("ids") ?? "").split(",").filter((id) => id !== "");

/** The ids the host holds and the caller may read, through the same source read as the real routes. */
async function heldIds(
  req: PayloadRequest,
  collection: string,
  ids: readonly DocumentId[],
  source: string
): Promise<DocumentId[]> {
  const read = latestOf(req.payload, collection);
  const found = await Promise.all(
    ids.map((id) =>
      fetchDocumentLocale({
        payload: req.payload,
        collection,
        id,
        locale: source,
        read,
        user: req.user,
      })
    )
  );
  return ids.filter((_, index) => found[index]);
}

export function readDocumentState({ world, managed }: StubDeps): RouteHandler {
  return async (req) => {
    const parsed = GetDocumentStatusInputSchema.safeParse(req.routeParams);
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_slug, collection_id } = parsed.data;
    if (!managed.has(collection_slug)) return ServerResponse.badRequest(NOT_MANAGED);
    const locales = localesOf(req);
    if (!locales) return ServerResponse.badRequest(NO_LOCALIZATION);

    const state: DocumentTranslationState = world.documentState(
      { collection: collection_slug, id: collection_id },
      locales
    );
    return ServerResponse.success(state);
  };
}

export function readListState({ world, managed }: StubDeps): RouteHandler {
  return async (req) => {
    const parsed = GetCollectionStatusInputSchema.safeParse(req.routeParams);
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_slug } = parsed.data;
    if (!managed.has(collection_slug)) return ServerResponse.badRequest(NOT_MANAGED);
    const locales = localesOf(req);
    if (!locales) return ServerResponse.badRequest(NO_LOCALIZATION);

    const ids = await heldIds(req, collection_slug, idsAsked(req), locales.source);
    const state: ListTranslationState = world.listState(collection_slug, ids, locales);
    return ServerResponse.success(state);
  };
}
