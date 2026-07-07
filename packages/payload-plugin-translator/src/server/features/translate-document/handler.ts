import type { Payload, SanitizedCollectionConfig } from "payload";
import { APIError } from "payload";

import type { Handler } from "../../shared";
import type { TranslationProvider } from "../../../core/translation-providers";
import { translateContent } from "../../../core/translation-pipeline";
import { computeSourceFingerprint } from "../../../core/content-projection/computeSourceFingerprint";
import type { ProvenanceStoreFactory } from "../../modules/provenance";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { TranslateDocumentInput, TranslateDocumentOutput } from "./model";

export type TranslateDocumentDependencies = {
  translationProvider: TranslationProvider;
  schemaMap: CollectionSchemaMap;
};

/**
 * Translates a single document from source language to target language
 */
export class TranslateDocumentHandler implements Handler<
  TranslateDocumentInput,
  TranslateDocumentOutput
> {
  private readonly translationProvider: TranslationProvider;
  private readonly schemaMap: CollectionSchemaMap;
  private readonly provenanceStoreFactory?: ProvenanceStoreFactory;

  constructor(
    translationProvider: TranslationProvider,
    schemaMap: CollectionSchemaMap,
    provenanceStoreFactory?: ProvenanceStoreFactory
  ) {
    this.translationProvider = translationProvider;
    this.schemaMap = schemaMap;
    this.provenanceStoreFactory = provenanceStoreFactory;
  }

  async handle(payload: Payload, input: TranslateDocumentInput): Promise<TranslateDocumentOutput> {
    const { collection, collectionId, sourceLng, targetLng, strategy, publishOnTranslation } =
      input;

    // Get original schema (preserves localized: true on nested fields)
    const schema = this.schemaMap.get(collection);
    if (!schema) throw new APIError(`Collection "${collection}" not found in schemaMap`, 400);

    const sourceData = await payload.findByID({
      collection,
      id: collectionId,
      locale: sourceLng,
      depth: 0,
    });
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

    if (this.provenanceStoreFactory) {
      const store = this.provenanceStoreFactory(payload);
      try {
        await store.upsert({
          collectionSlug: collection,
          documentId: String(collectionId),
          targetLocale: targetLng,
          sourceLocale: sourceLng,
          sourceFingerprint: computeSourceFingerprint(sourceData, schema),
          translatedAt: new Date().toISOString(),
          dismissedFingerprint: null,
        });
      } catch (error) {
        payload.logger.error({
          err: error,
          collection,
          documentId: String(collectionId),
          targetLocale: targetLng,
          sourceLocale: sourceLng,
          msg: "translator: failed to record translation provenance",
        });
      }
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
