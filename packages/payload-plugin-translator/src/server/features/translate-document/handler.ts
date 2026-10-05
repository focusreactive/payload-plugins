import { asTranslatorError } from "../../../translation-providers/shared/errors/index.js";
import { TranslatorConfigError } from "../../../core/errors/index.js";
import type { Payload } from "payload";
import { APIError } from "payload";

import type { Handler } from "../../shared/index.js";
import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import { translateContent } from "../../../core/translation-pipeline/index.js";
import type { ProvenanceServiceFactory } from "../../modules/provenance/index.js";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { freshReq } from "../../shared/payload/RequestScope.shapes.js";
import { enforcedAtTheRead } from "../../shared/payload/enforcedAtTheRead.js";
import { checkTranslationPermission, mayWrite, rebuildRequester } from "./translationPermission.js";
import { SourceUnreadable } from "./SourceUnreadable.js";
import type { RebuiltRequester } from "./translationPermission.js";
import { TranslationRefused } from "./TranslationRefused.js";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../types/AutoTranslateContext.js";
import type { TranslateDocumentInput, TranslateDocumentOutput } from "./model.js";
import { resolveTargetLayer } from "./targetLayer.js";
import type { PublishScope, TargetLayer } from "./targetLayer.js";
import { changedLeaves } from "../../../core/domain/provenance/index.js";

const translatorWriteContext = () => ({ [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true });

/**
 * Payload applies the collection's field rules to this write itself, deleting a field the requester
 * may not write (`fields/hooks/beforeValidate/promise.js`) — it does not throw, so this is safe even
 * inside the editor's transaction. An unattributed write keeps the behaviour it always had.
 */
function enforcedAtTheWrite(
  requester: RebuiltRequester | null
): { overrideAccess: false; user: RebuiltRequester } | Record<string, never> {
  if (!requester) return {};
  return { overrideAccess: false, user: requester };
}

export class TranslateDocumentHandler implements Handler<
  TranslateDocumentInput,
  TranslateDocumentOutput
> {
  private readonly translationProvider: TranslationProvider;
  private readonly schemaMap: CollectionSchemaMap;
  private readonly provenanceServiceFactory?: ProvenanceServiceFactory;
  private readonly inlineMarks: boolean;

  constructor(
    translationProvider: TranslationProvider,
    schemaMap: CollectionSchemaMap,
    provenanceServiceFactory?: ProvenanceServiceFactory,
    inlineMarks = false
  ) {
    this.translationProvider = translationProvider;
    this.schemaMap = schemaMap;
    this.provenanceServiceFactory = provenanceServiceFactory;
    this.inlineMarks = inlineMarks;
  }

  async handle(
    payload: Payload,
    input: TranslateDocumentInput,
    scope: RequestScope = {}
  ): Promise<TranslateDocumentOutput> {
    const { collection, collectionId, sourceLng, targetLng, strategy, publishOnTranslation } =
      input;

    const schema = this.schemaMap.get(collection);
    if (!schema) {
      throw new TranslatorConfigError(`Collection "${collection}" not found in schemaMap`);
    }

    const layer = resolveTargetLayer({
      versions: payload.collections[collection].config.versions,
      targetLng,
    });

    const requester = await rebuildRequester(payload, scope);

    const [sourceData, currentTargetVersion] = await Promise.all([
      fetchSourceDocument({
        payload,
        collection,
        id: String(collectionId),
        locale: sourceLng,
        user: requester,
        scope,
      }),
      payload.findByID({
        req: freshReq(scope),
        collection,
        id: collectionId,
        locale: targetLng,
        fallbackLocale: false,
        depth: 0,
        ...enforcedAtTheRead(requester),
        draft: true,
      }),
    ]);
    if (!sourceData) throw new SourceUnreadable(collection, sourceLng);
    if (!currentTargetVersion) throw new SourceUnreadable(collection, targetLng);

    const allowed = await checkTranslationPermission({
      payload,
      collection,
      id: String(collectionId),
      data: sourceData,
      targetLocale: targetLng,
      scope,
      user: requester,
    });
    if (!allowed) throw new TranslationRefused(collection, targetLng);

    const provenance = this.provenanceServiceFactory?.(payload, scope);
    const provenanceKey = {
      collectionSlug: collection,
      documentId: String(collectionId),
      targetLocale: targetLng,
    };
    const currentFields = provenance?.captureFingerprint(collection, sourceData) ?? null;
    const previous = provenance ? await provenance.lastTranslatedFrom(provenanceKey) : null;

    const translated = await this.translateOrWrap({
      schema,
      sourceData,
      targetData: currentTargetVersion,
      sourceLng,
      targetLng,
      translationProvider: this.translationProvider,
      strategy,
      inlineMarks: this.inlineMarks,
      sourceChangedByLeaf: currentFields ? changedLeaves(previous, currentFields) : undefined,
    });

    if (translated?.translatedData) {
      const { translatedData, translatedPaths } = translated;
      await this.refuseUnlessAllowed(payload, input, translatedData, scope, requester);
      await this.saveTranslatedDocument(
        payload,
        input,
        translatedData,
        layer.write,
        scope,
        requester
      );

      if (provenance && currentFields !== null) {
        await provenance.record(
          { ...provenanceKey, sourceLocale: sourceLng },
          currentFields,
          translatedPaths
        );
      }
    }

    if (publishOnTranslation && layer.kind === "drafts") {
      const status = { _status: layer.publish.status };
      await this.refuseUnlessAllowed(payload, input, status, scope, requester);
      await this.publishTargetLocale(payload, input, layer.publish, scope, requester);
    }

    return { success: true };
  }

  /**
   * The check before the provider call was asked about the source document; Payload will ask the same
   * rule about the payload below. A rule that reads `data` answers differently to the two, and at the
   * write a refusal is a `Forbidden` — inside the editor's transaction, that is their save. So ask
   * once more with exactly what is about to be sent, while a refusal still costs only the translation.
   */
  private async refuseUnlessAllowed(
    payload: Payload,
    input: TranslateDocumentInput,
    data: Record<string, unknown>,
    scope: RequestScope,
    requester: RebuiltRequester | null
  ): Promise<void> {
    if (!requester) return;
    const allowed = await mayWrite({
      payload,
      collection: input.collection,
      id: String(input.collectionId),
      data,
      targetLocale: input.targetLng,
      scope,
      user: requester,
    });
    if (!allowed) throw new TranslationRefused(input.collection, input.targetLng);
  }

  /**
   * A `TranslationProvider` is a host extension point, so whatever it throws is outside this
   * plugin's control, and an unrecognised error otherwise reads as "a Payload operation failed" —
   * which would surface a provider outage as a lost save. An `APIError` is the exception: a provider
   * is free to query Payload itself, and if it did, that operation has already rolled the caller's
   * transaction back. Only a failure carrying no such evidence is safe to adopt as ours.
   */
  private async translateOrWrap(
    args: Parameters<typeof translateContent>[0]
  ): Promise<Awaited<ReturnType<typeof translateContent>>> {
    try {
      return await translateContent(args);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw asTranslatorError(error);
    }
  }

  private async saveTranslatedDocument(
    payload: Payload,
    input: TranslateDocumentInput,
    translatedData: Record<string, unknown>,
    write: TargetLayer["write"],
    scope: RequestScope,
    requester: RebuiltRequester | null
  ): Promise<void> {
    await payload.update({
      req: freshReq(scope),
      ...enforcedAtTheWrite(requester),
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
    publish: PublishScope,
    scope: RequestScope,
    requester: RebuiltRequester | null
  ): Promise<void> {
    await payload.update({
      req: freshReq(scope),
      ...enforcedAtTheWrite(requester),
      collection: input.collection,
      id: input.collectionId,
      data: { _status: publish.status },
      publishSpecificLocale: publish.publishSpecificLocale,
      locale: publish.publishSpecificLocale,
      context: translatorWriteContext(),
    });
  }
}
