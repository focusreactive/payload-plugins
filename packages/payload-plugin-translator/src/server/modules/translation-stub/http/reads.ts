import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../../shared/index.js";
import type { RouteHandler } from "../../../shared/http/withErrorHandler.js";
import { GetDocumentStatusInputSchema } from "../../../features/get-document-status/model.js";
import { GetCollectionStatusInputSchema } from "../../../features/get-collection-status/model.js";
import type { DocumentTranslationState } from "../../../../types/wire/DocumentTranslationState.js";
import type { ListTranslationState } from "../../../../types/wire/ListTranslationState.js";
import type { DocumentId } from "../../../../types/wire/primitives.js";

import { localesOf } from "./localesOf.js";
import { NOT_MANAGED, NO_LOCALIZATION } from "./refusals.js";
import type { StubDeps } from "./StubDeps.js";

const idsAsked = (req: PayloadRequest): DocumentId[] =>
  (req.searchParams.get("ids") ?? "").split(",").filter((id) => id !== "");

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

    const state: ListTranslationState = world.listState(collection_slug, idsAsked(req), locales);
    return ServerResponse.success(state);
  };
}
