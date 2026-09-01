import type { Payload } from "payload";
import { APIError } from "payload";

import type { Handler } from "../../shared";
import type { TranslationProvider } from "../../../core/domain/translation-providers";
import { translateContent } from "../../../core/translation-pipeline";
import type { ProvenanceServiceFactory } from "../../modules/provenance";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../types/AutoTranslateContext";
import type { TranslateDocumentInput, TranslateDocumentOutput } from "./model";
import { resolveTargetLayer } from "./targetLayer";
import type { PublishScope, TargetLayer } from "./targetLayer";

/** Loop guard: the auto-translate afterChange hook (#51) skips writes carrying this key. */
const translatorWriteContext = () => ({ [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true });

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

    const schema = this.schemaMap.get(collection);
    if (!schema) throw new APIError(`Collection "${collection}" not found in schemaMap`, 400);

    const layer = resolveTargetLayer({
      versions: payload.collections[collection].config.versions,
      targetLng,
    });

    // `draft: true` is unconditional: on a collection without drafts Payload has no version to
    // substitute, so it returns the only row. The WRITE cannot be so relaxed — the `no-drafts`
    // layer omits `draft` entirely, because that is the argument shape `main` sent.
    const [sourceData, currentTargetVersion] = await Promise.all([
      fetchSourceDocument(payload, collection, collectionId, sourceLng),
      payload.findByID({
        collection,
        id: collectionId,
        locale: targetLng,
        fallbackLocale: false,
        depth: 0,
        draft: true,
      }),
    ]);

    const provenance = this.provenanceServiceFactory?.(payload);
    const sourceFingerprint = provenance?.captureFingerprint(collection, sourceData) ?? null;

    const translatedData = await translateContent({
      schema,
      sourceData,
      targetData: currentTargetVersion,
      sourceLng,
      targetLng,
      translationProvider: this.translationProvider,
      strategy,
    });

    if (translatedData) {
      await this.saveTranslatedDocument(payload, input, translatedData, layer.write);

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
    }

    if (publishOnTranslation && layer.kind === "drafts") {
      await this.publishTargetLocale(payload, input, layer.publish);
    }

    return { success: true };
  }

  private async saveTranslatedDocument(
    payload: Payload,
    input: TranslateDocumentInput,
    translatedData: Record<string, unknown>,
    write: TargetLayer["write"]
  ): Promise<void> {
    await payload.update({
      collection: input.collection,
      id: input.collectionId,
      data: translatedData,
      ...write,
      locale: input.targetLng,
      fallbackLocale: input.sourceLng,
      context: translatorWriteContext(),
    });
  }

  private async publishTargetLocale(
    payload: Payload,
    input: TranslateDocumentInput,
    publish: PublishScope
  ): Promise<void> {
    await payload.update({
      collection: input.collection,
      id: input.collectionId,
      data: { _status: publish.status },
      publishSpecificLocale: publish.publishSpecificLocale,
      locale: publish.publishSpecificLocale,
      context: translatorWriteContext(),
    });
  }
}
