import type { Payload, SanitizedCollectionConfig } from "payload";
import { APIError } from "payload";

import type { Handler } from "../../shared";
import type { TranslationProvider } from "../../../core/translation-providers";
import { translateContent } from "../../../core/translation-pipeline";
import type { ProvenanceServiceFactory } from "../../modules/provenance";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
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

    const targetData = await payload.findByID({
      collection,
      id: collectionId,
      locale: targetLng,
      fallbackLocale: false,
      depth: 0,
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
    let isAutosaveEnabled = false;
    const versions = collectionConfig.versions;

    if (versions && versions.drafts) {
      translatedData["_status"] = publishOnTranslation ? "published" : "draft";

      const drafts = versions.drafts;
      if (!publishOnTranslation && drafts.autosave) isAutosaveEnabled = true;
    }

    await payload.update({
      collection: collection,
      id: collectionId,
      data: translatedData,
      autosave: isAutosaveEnabled,
      locale: targetLng,
      fallbackLocale: sourceLng,
    });
  }
}
