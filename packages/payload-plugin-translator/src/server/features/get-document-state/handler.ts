import type { CollectionSlug, PayloadRequest } from "payload";

import type { ProvenanceReceipt } from "../../../core/domain/provenance/index.js";
import type { DocumentTranslationState } from "../../../types/wire/DocumentTranslationState.js";
import type { LocaleCode } from "../../../types/wire/primitives.js";
import { reportedRuns, runStateOf } from "../../modules/runs/index.js";
import type { ReportedRun, RunRecordStoreFactory } from "../../modules/runs/index.js";
import { ServerResponse } from "../../shared/index.js";
import { NOT_MANAGED, NO_LOCALIZATION } from "../../shared/http/readRefusals.js";
import { localesHoldingContent } from "../../shared/payload/localesHoldingContent.js";
import { isCollectionAvailable, readLocales, requireReadableDocument } from "../_lib/index.js";
import type { ReadLocales } from "../_lib/index.js";

import { collectionPresentation } from "./collectionPresentation.js";
import { documentTree } from "./documentTree.js";
import { excludedLabels } from "./excludedLabels.js";
import { localeContentOf } from "./localeContent.js";
import { GetDocumentStateInputSchema } from "./model.js";
import type { GetDocumentStateConfig } from "./model.js";

export class GetDocumentStateHandler {
  private readonly config: GetDocumentStateConfig;
  private readonly runRecordStoreFactory: RunRecordStoreFactory;

  constructor(config: GetDocumentStateConfig, runRecordStoreFactory: RunRecordStoreFactory) {
    this.config = config;
    this.runRecordStoreFactory = runRecordStoreFactory;
  }

  async handle(req: PayloadRequest): Promise<Response> {
    const parsed = GetDocumentStateInputSchema.safeParse(req.routeParams);
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_slug, collection_id } = parsed.data;
    const collection = isCollectionAvailable(collection_slug, this.config.availableCollections);
    if (!collection) return ServerResponse.badRequest(NOT_MANAGED);

    const locales = readLocales(req, collection);
    if (!locales) return ServerResponse.badRequest(NO_LOCALIZATION);

    const found = await requireReadableDocument({
      req,
      collection,
      id: collection_id,
      sourceLocale: locales.source,
    });
    if (!found.readable) return found.refusal;

    return ServerResponse.success(
      await this.stateOf({ req, collection, id: collection_id, document: found.document, locales })
    );
  }

  private async receiptsOf(
    req: PayloadRequest,
    collection: CollectionSlug,
    id: string
  ): Promise<ReadonlyMap<LocaleCode, ProvenanceReceipt>> {
    const { provenance } = this.config;
    if (!provenance) return new Map();
    const records = await provenance.storeFactory(req.payload).findByDocument(collection, id);
    return new Map(records.map((record) => [record.targetLocale, record]));
  }

  private async runsOf(
    req: PayloadRequest,
    collection: CollectionSlug,
    id: string
  ): Promise<ReportedRun[]> {
    const rows = await this.runRecordStoreFactory(req.payload).findByDocument({
      collectionSlug: collection,
      collectionId: id,
    });
    return reportedRuns(rows);
  }

  private async stateOf(read: {
    req: PayloadRequest;
    collection: CollectionSlug;
    id: string;
    document: Record<string, unknown>;
    locales: ReadLocales;
  }): Promise<DocumentTranslationState> {
    const { req, collection, id, document, locales } = read;
    const schema = this.config.schemaMap.get(collection) ?? [];
    const registered = req.payload.config.collections.find((one) => one.slug === collection);
    const presentation = collectionPresentation({
      fields: registered?.fields ?? [],
      sharedBlocks: req.payload.config.blocks ?? [],
      language: req.i18n?.language,
    });
    const currentFields = this.config.fingerprintOf(collection, document) ?? {};

    const [holding, receipts, runs] = await Promise.all([
      localesHoldingContent({
        payload: req.payload,
        collection,
        ids: [id],
        locales: locales.targets,
        paths: this.config.translatablePaths(collection),
      }),
      this.receiptsOf(req, collection, id),
      this.runsOf(req, collection, id),
    ]);

    return {
      collection,
      id,
      sourceLocale: locales.source,
      tree: documentTree({ document, schema, presentation }),
      excluded: excludedLabels(schema, presentation),
      locales: locales.targets.map((locale) => ({
        locale,
        content: localeContentOf({
          holdsContent: holding.get(locale)?.has(id) === true,
          keepsRecords: this.config.provenance !== undefined,
          receipt: receipts.get(locale),
          currentFields,
        }),
        run: runStateOf({ runs, locale, configuredLocales: locales.configured }),
      })),
    };
  }
}
