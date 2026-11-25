import type { CollectionSlug, PayloadRequest } from "payload";

import { receiptsByDocument } from "../../../core/domain/provenance/index.js";
import type { ReceiptsByDocument } from "../../../core/domain/provenance/index.js";
import type {
  ListDocumentState,
  ListTranslationState,
} from "../../../types/wire/ListTranslationState.js";
import type { DocumentId } from "../../../types/wire/primitives.js";
import { reportedRuns, runStateOf } from "../../modules/runs/index.js";
import type { ReportedRun, RunRecordStoreFactory } from "../../modules/runs/index.js";
import { ServerResponse } from "../../shared/index.js";
import { NOT_MANAGED, NO_LOCALIZATION } from "../../shared/http/readRefusals.js";
import { visibleIds } from "../../shared/payload/collections.js";
import { localesHoldingContent } from "../../shared/payload/localesHoldingContent.js";
import type { DocumentsHoldingContent } from "../../shared/payload/localesHoldingContent.js";
import { latestOf } from "../../shared/payload/worldOfCollection.js";
import { isCollectionAvailable, readLocales } from "../_lib/index.js";
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

  private async runsOf(
    req: PayloadRequest,
    collection: CollectionSlug,
    ids: readonly DocumentId[]
  ): Promise<ReportedRun[]> {
    const store = this.runRecordStoreFactory(req.payload);
    const since = new Date(Date.now() - this.config.failedWindowMs);
    const [live, undelivered] = await Promise.all([
      store.findLiveForDocuments(collection, [...ids]),
      store.findRecentlyUndeliveredInCollection(collection, since),
    ]);
    const asked = new Set(ids);
    return reportedRuns([...live, ...undelivered]).filter(({ row }) => asked.has(row.collectionId));
  }

  private async receiptsOf(
    req: PayloadRequest,
    collection: CollectionSlug,
    ids: readonly DocumentId[]
  ): Promise<ReceiptsByDocument> {
    const { provenance } = this.config;
    if (!provenance) return new Map();
    return await receiptsByDocument(provenance.storeFactory(req.payload), collection, ids);
  }

  private async rowsOf(read: {
    req: PayloadRequest;
    collection: CollectionSlug;
    ids: readonly DocumentId[];
    locales: ReadLocales;
  }): Promise<ListDocumentState[]> {
    const { req, collection, ids, locales } = read;
    if (ids.length === 0) return [];

    const [holding, receipts, runs] = await Promise.all([
      localesHoldingContent({
        payload: req.payload,
        collection,
        grantedIds: ids,
        locales: locales.targets,
        holdsText: this.config.holdsText,
        read: latestOf(req.payload, collection),
      }),
      this.receiptsOf(req, collection, ids),
      this.runsOf(req, collection, ids),
    ]);

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
