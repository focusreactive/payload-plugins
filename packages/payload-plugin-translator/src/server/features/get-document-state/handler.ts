import type { CollectionSlug, PayloadRequest } from "payload";

import type { ProvenanceReceipt } from "../../../core/domain/provenance/index.js";
import type { DocumentTranslationState } from "../../../types/wire/DocumentTranslationState.js";
import type { LocaleCode } from "../../../types/wire/primitives.js";
import { runStateOf } from "../../modules/runs/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import { ServerResponse } from "../../shared/index.js";
import { NOT_MANAGED, NO_LOCALIZATION } from "../../shared/http/readRefusals.js";
import {
  isCollectionAvailable,
  readLocales,
  readSourceFields,
  readState,
  requireReadableDocument,
} from "../_lib/index.js";
import type { ReadLocales } from "../_lib/index.js";

import { collectionPresentation } from "./collectionPresentation.js";
import { documentTree } from "./documentTree.js";
import { excludedLabels } from "./excludedLabels.js";
import { localeContentOf } from "./localeContent.js";
import type { SourcesAsTheyStand } from "./localeContent.js";
import { GetDocumentStateInputSchema } from "./model.js";
import type { GetDocumentStateConfig } from "./model.js";

type DocumentRead = {
  req: PayloadRequest;
  collection: CollectionSlug;
  id: string;
  document: Record<string, unknown>;
  locales: ReadLocales;
};

const receiptsByLocale = (
  receipts: readonly ProvenanceReceipt[]
): ReadonlyMap<LocaleCode, ProvenanceReceipt> =>
  new Map(receipts.map((receipt) => [receipt.targetLocale, receipt]));

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

  private shapeOf({
    req,
    collection,
    document,
  }: Pick<DocumentRead, "req" | "collection" | "document">): Pick<
    DocumentTranslationState,
    "tree" | "excluded"
  > {
    const schema = this.config.schemaMap.get(collection) ?? [];
    const registered = req.payload.config.collections.find((one) => one.slug === collection);
    const presentation = collectionPresentation({
      fields: registered?.fields ?? [],
      sharedBlocks: req.payload.config.blocks ?? [],
      language: req.i18n?.language,
    });
    return {
      tree: documentTree({ document, schema, presentation }),
      excluded: excludedLabels(schema, presentation),
    };
  }

  private async sourcesAsTheyStand(
    read: DocumentRead,
    judgedFrom: readonly LocaleCode[]
  ): Promise<SourcesAsTheyStand> {
    const { req, collection, id, document, locales } = read;
    const others = new Set(judgedFrom);
    others.delete(locales.source);

    const { fingerprintOf } = this.config;
    const othersNow = await Promise.all(
      [...others].map(
        async (locale) =>
          [locale, await readSourceFields({ req, collection, id, locale, fingerprintOf })] as const
      )
    );
    return new Map([[locales.source, fingerprintOf(collection, document) ?? {}], ...othersNow]);
  }

  private async stateOf(read: DocumentRead): Promise<DocumentTranslationState> {
    const { req, collection, id, locales } = read;
    const shown = await readState({
      payload: req.payload,
      collection,
      ids: [id],
      targets: locales.targets,
      holdsText: this.config.holdsText,
      provenance: this.config.provenance,
      runRecordStoreFactory: this.runRecordStoreFactory,
      failedWindowMs: this.config.failedWindowMs,
    });
    const holdsContent = (locale: LocaleCode) => shown.holding.get(locale)?.has(id) === true;
    const receipts = receiptsByLocale(shown.receipts.get(id) ?? []);
    const receiptIfHeld = (locale: LocaleCode) =>
      holdsContent(locale) ? receipts.get(locale) : undefined;
    const sources = await this.sourcesAsTheyStand(
      read,
      locales.targets.flatMap((locale) => receiptIfHeld(locale)?.sourceLocale ?? [])
    );

    return {
      collection,
      id,
      sourceLocale: locales.source,
      ...this.shapeOf(read),
      locales: locales.targets.map((locale) => ({
        locale,
        content: localeContentOf({
          holdsContent: holdsContent(locale),
          keepsRecords: this.config.provenance !== undefined,
          receipt: receiptIfHeld(locale),
          sources,
        }),
        run: runStateOf({ runs: shown.runs, locale, configuredLocales: locales.configured }),
      })),
    };
  }
}
