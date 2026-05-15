import type { Payload, SanitizedCollectionConfig } from "payload";
import { APIError } from "payload";

import { TranslationPipeline } from "../../modules/translation-pipeline";
import { createTranslationStrategy } from "../../modules/translation-pipeline/strategies";
import type { TranslationProvider } from "../../modules/translation-providers";
import type { Handler } from "../../shared";
import type {
  CollectionSchemaMap,
  TranslateDocumentInput,
  TranslateDocumentOutput,
} from "./model";

export interface TranslateDocumentDependencies {
  translationProvider: TranslationProvider;
  schemaMap: CollectionSchemaMap;
}

/**
 * Translates a single document from source language to target language
 */
export class TranslateDocumentHandler implements Handler<
  TranslateDocumentInput,
  TranslateDocumentOutput
> {
  constructor(
    private readonly translationProvider: TranslationProvider,
    private readonly schemaMap: CollectionSchemaMap
  ) {}

  async handle(
    payload: Payload,
    input: TranslateDocumentInput
  ): Promise<TranslateDocumentOutput> {
    const {
      collection,
      collectionId,
      sourceLng,
      targetLng,
      strategy,
      publishOnTranslation,
    } = input;

    // Get original schema (preserves localized: true on nested fields)
    const schema = this.schemaMap.get(collection);
    if (!schema)
      {throw new APIError(
        `Collection "${collection}" not found in schemaMap`,
        400
      );}

    const sourceData = await payload.findByID({
      collection,
      depth: 0,
      id: collectionId,
      locale: sourceLng,
    });
    const targetData = await payload.findByID({
      collection,
      depth: 0,
      fallbackLocale: false,
      id: collectionId,
      locale: targetLng,
    });

    const translationStrategy = createTranslationStrategy(strategy);
    const pipeline = new TranslationPipeline({
      translationProvider: this.translationProvider,
      translationStrategy,
    });

    const result = await pipeline.execute({
      schema,
      sourceData,
      sourceLng,
      targetData,
      targetLng,
    });
    if (!result) {return { success: true };}

    const collectionConfig = payload.collections[collection].config;
    await this.saveTranslatedDocument(
      payload,
      collection,
      collectionId,
      result.translatedData,
      targetLng,
      sourceLng,
      collectionConfig,
      publishOnTranslation
    );

    return { success: true };
  }

  private async saveTranslatedDocument(
    payload: Payload,
    collection: string,
    collectionId: string | number,
    translatedData: Record<string, unknown>,
    targetLng: string,
    sourceLng: string,
    collectionConfig: SanitizedCollectionConfig,
    publishOnTranslation: boolean
  ): Promise<void> {
    let isAutosaveEnabled = false;
    const {versions} = collectionConfig;

    if (versions && versions.drafts) {
      translatedData["_status"] = publishOnTranslation ? "published" : "draft";

      const {drafts} = versions;
      if (!publishOnTranslation && drafts.autosave) {isAutosaveEnabled = true;}
    }

    await payload.update({
      collection,
      id: collectionId,
      data: translatedData,
      autosave: isAutosaveEnabled,
      locale: targetLng,
      fallbackLocale: sourceLng,
    });
  }
}
