import type { Payload, SanitizedCollectionConfig } from "payload";
import { APIError } from "payload";

import type { Handler } from "../../shared";
import type { TranslationProvider } from "../../../core/domain/translation-providers";
import { translateContent } from "../../../core/translation-pipeline";
import type { ProvenanceServiceFactory } from "../../modules/provenance";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../types/AutoTranslateContext";
import type { TranslateDocumentInput, TranslateDocumentOutput } from "./model";

/**
 * Translates a single document from source language to target language. Provenance is delegated to
 * {@link ProvenanceService}: this handler only decides *when* to capture the source fingerprint
 * (before the pipeline mutates the source in place) and *when* to record it (after the save).
 */
export class TranslateDocumentHandler implements Handler<
  TranslateDocumentInput,
  TranslateDocumentOutput
> {
  private readonly translationProvider: TranslationProvider;
  private readonly schemaMap: CollectionSchemaMap;
  private readonly provenanceServiceFactory?: ProvenanceServiceFactory;

  constructor(
    translationProvider: TranslationProvider,
    schemaMap: CollectionSchemaMap,
    provenanceServiceFactory?: ProvenanceServiceFactory
  ) {
    this.translationProvider = translationProvider;
    this.schemaMap = schemaMap;
    this.provenanceServiceFactory = provenanceServiceFactory;
  }

  async handle(payload: Payload, input: TranslateDocumentInput): Promise<TranslateDocumentOutput> {
    const { collection, collectionId, sourceLng, targetLng, strategy, publishOnTranslation } =
      input;

    // Get original schema (preserves localized: true on nested fields)
    const schema = this.schemaMap.get(collection);
    if (!schema) throw new APIError(`Collection "${collection}" not found in schemaMap`, 400);

    const sourceData = await fetchSourceDocument(payload, collection, collectionId, sourceLng);

    // Capture the staleness baseline from the PRISTINE source NOW, before the pipeline runs — it
    // translates in place and shares object-valued source leaves (e.g. richText nodes) by reference,
    // so fingerprinting after `translateContent` would hash the target translation and make every
    // fresh translation look instantly stale. The service is best-effort (a failure returns null).
    const provenance = this.provenanceServiceFactory?.(payload);
    const sourceFingerprint = provenance?.captureFingerprint(collection, sourceData) ?? null;

    // Optional-chained on purpose: the config is REQUIRED further down, at the save, but this read
    // happens before the "nothing to translate" early return, and widening what the handler needs
    // that early would break callers that never reach a save.
    const hasDrafts = Boolean(payload.collections?.[collection]?.config?.versions?.drafts);

    // READ FROM THE LAYER WE ARE ABOUT TO WRITE TO. The reconciler carries every leaf it does not
    // translate — non-localized fields, non-text localized ones — straight from this read into the
    // write, so the two must come from the same layer or the write promotes content across it:
    //   - draft mode writes a version row, so read the draft. A published-only read would show an
    //     empty target, and `skip_existing` would skip nothing and re-translate over a human's
    //     corrections.
    //   - publish mode writes the live document, so read the published row. Reading the draft here
    //     would carry a colleague's pending edits to untranslated fields live — the same class of
    //     leak this whole change exists to close (#102).
    const targetData = await payload.findByID({
      collection,
      id: collectionId,
      locale: targetLng,
      fallbackLocale: false,
      depth: 0,
      draft: hasDrafts && !publishOnTranslation,
    });

    const translatedData = await translateContent({
      schema,
      sourceData,
      targetData,
      sourceLng,
      targetLng,
      translationProvider: this.translationProvider,
      strategy,
    });
    if (!translatedData) return { success: true };

    const collectionConfig = payload.collections[collection].config;
    await this.saveTranslatedDocument(
      payload,
      collection,
      collectionId,
      translatedData,
      targetLng,
      sourceLng,
      collectionConfig,
      publishOnTranslation
    );

    if (provenance && sourceFingerprint !== null) {
      await provenance.record(
        {
          collectionSlug: collection,
          documentId: String(collectionId),
          targetLocale: targetLng,
          sourceLocale: sourceLng,
        },
        sourceFingerprint
      );
    }

    return { success: true };
  }

  private async saveTranslatedDocument(
    payload: Payload,
    collection: string,
    collectionId: string,
    translatedData: Record<string, unknown>,
    targetLng: string,
    sourceLng: string,
    collectionConfig: SanitizedCollectionConfig,
    publishOnTranslation: boolean
  ): Promise<void> {
    const drafts = collectionConfig.versions?.drafts;

    let isAutosaveEnabled = false;
    let draft: true | undefined;
    let publishSpecificLocale: string | undefined;

    if (drafts) {
      if (publishOnTranslation) {
        // Scope the publish to the locale we translated, instead of publishing the whole document
        // and every other locale's pending draft with it (#102).
        publishSpecificLocale = targetLng;
        // Load-bearing despite looking redundant: `publishSpecificLocale` alone drops the document to
        // `draft` whenever ANY other locale holds a pending draft. Measured — see
        // docs/plans/2026-08-31-draft-safe-locale-writes.md.
        translatedData["_status"] = "published";
      } else {
        // Route the write to a version row instead of the main table. `_status` is deliberately NOT
        // set: because Payload stores it as ONE non-localized column per document, writing it here
        // without `draft` is what used to unpublish the whole document, in every locale (#102).
        draft = true;
        if (drafts.autosave) isAutosaveEnabled = true;
      }
    }

    await payload.update({
      collection: collection,
      id: collectionId,
      data: translatedData,
      autosave: isAutosaveEnabled,
      draft,
      publishSpecificLocale,
      locale: targetLng,
      fallbackLocale: sourceLng,
      // Mark this as a translator-authored write so the auto-translate afterChange hook (#51) skips it
      // — the loop guard's second barrier, alongside the source-locale check. This write always targets
      // the TARGET locale, so it is already exempt by locale; the flag also covers any future write
      // path that could touch the source locale.
      context: { [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true },
    });
  }
}
