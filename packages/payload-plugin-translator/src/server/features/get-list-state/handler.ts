import type { CollectionSlug, PayloadRequest } from "payload";

import type { ReceiptsByDocument } from "../../../core/domain/provenance/index.js";
import type {
  ListDocumentState,
  ListTranslationState,
} from "../../../types/wire/ListTranslationState.js";
import type { DocumentId } from "../../../types/wire/primitives.js";
import { runStateOf } from "../../modules/runs/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import { ServerResponse } from "../../shared/index.js";
import { NOT_MANAGED, NO_LOCALIZATION } from "../../shared/http/readRefusals.js";
import { visibleIds } from "../../shared/payload/collections.js";
import type { DocumentsHoldingContent } from "../../shared/payload/localesHoldingContent.js";
import { isCollectionAvailable, readLocales, readState } from "../_lib/index.js";
import type { ReadLocales } from "../_lib/index.js";

import { AskedIdsSchema, GetListStateInputSchema } from "./model.js";
import type { GetListStateConfig } from "./model.js";

function contentOf(cell: {
  id: DocumentId;
  locale: string;
  holding: DocumentsHoldingContent;
  receipts: ReceiptsByDocument;
}): ListDocumentState["locales"][number]["content"] {
  if (cell.holding.get(cell.locale)?.has(cell.id) !== true) return { kind: "empty" };
  const receipt = (cell.receipts.get(cell.id) ?? []).find(
    (one) => one.targetLocale === cell.locale
  );
  return { kind: "filled", translatedAt: receipt?.translatedAt ?? null };
}

export class GetListStateHandler {
  private readonly config: GetListStateConfig;
  private readonly runRecordStoreFactory: RunRecordStoreFactory;

  constructor(config: GetListStateConfig, runRecordStoreFactory: RunRecordStoreFactory) {
    this.config = config;
    this.runRecordStoreFactory = runRecordStoreFactory;
  }

  async handle(req: PayloadRequest): Promise<Response> {
    const parsed = GetListStateInputSchema.safeParse(req.routeParams);
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const asked = AskedIdsSchema.safeParse(req.searchParams.get("ids") ?? undefined);
    if (asked.error) return ServerResponse.validationError(asked.error.issues);

    const collection = isCollectionAvailable(
      parsed.data.collection_slug,
      this.config.availableCollections
    );
    if (!collection) return ServerResponse.badRequest(NOT_MANAGED);

    const locales = readLocales(req, collection);
    if (!locales) return ServerResponse.badRequest(NO_LOCALIZATION);

    const visible = await visibleIds(req.payload, collection, asked.data, req.user);
    const kept = asked.data.filter((id) => visible.has(id));

    const state: ListTranslationState = {
      collection,
      docs: await this.rowsOf({ req, collection, ids: kept, locales }),
    };
    return ServerResponse.success(state);
  }

  private async rowsOf(read: {
    req: PayloadRequest;
    collection: CollectionSlug;
    ids: readonly DocumentId[];
    locales: ReadLocales;
  }): Promise<ListDocumentState[]> {
    const { req, collection, ids, locales } = read;
    if (ids.length === 0) return [];
    const { holding, receipts, runs } = await readState({
      payload: req.payload,
      collection,
      ids,
      targets: locales.targets,
      holdsText: this.config.holdsText,
      provenance: this.config.provenance,
      runRecordStoreFactory: this.runRecordStoreFactory,
      failedWindowMs: this.config.failedWindowMs,
    });

    return ids.map((id) => ({
      id,
      locales: locales.targets.map((locale) => ({
        locale,
        content: contentOf({ id, locale, holding, receipts }),
        run: runStateOf({
          runs: runs.filter(({ row }) => row.collectionId === id),
          locale,
          configuredLocales: locales.configured,
        }),
      })),
    }));
  }
}
