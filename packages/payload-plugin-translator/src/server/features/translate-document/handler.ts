import type { Payload } from "payload";
import { APIError } from "payload";

import type { Handler } from "../../shared/index.js";
import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import { translateContent } from "../../../core/translation-pipeline/index.js";
import type { ProvenanceServiceFactory } from "../../modules/provenance/index.js";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { freshReq } from "../../shared/payload/RequestScope.shapes.js";
import {
  checkTranslationPermission,
  mayWrite,
} from "../../shared/payload/translationPermission.js";
import type { TranslationPermission } from "../../shared/payload/translationPermission.js";
import { TranslationRefused } from "../../shared/payload/TranslationRefused.js";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../types/AutoTranslateContext.js";
import type { TranslateDocumentInput, TranslateDocumentOutput } from "./model.js";
import { resolveTargetLayer } from "./targetLayer.js";
import type { PublishScope, TargetLayer } from "./targetLayer.js";

const translatorWriteContext = () => ({ [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true });

/**
 * Payload applies the collection's field rules to this write itself, deleting a field the requester
 * may not write (`fields/hooks/beforeValidate/promise.js`) — it does not throw, so this is safe even
 * inside the editor's transaction. An unattributed write keeps the behaviour it always had.
 */
function enforcedAtTheWrite(
  permission: TranslationPermission
): { overrideAccess: false; user: Record<string, unknown> } | Record<string, never> {
  if (!permission.user) return {};
  return { overrideAccess: false, user: permission.user };
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
    if (!schema) throw new APIError(`Collection "${collection}" not found in schemaMap`, 400);

    const layer = resolveTargetLayer({
      versions: payload.collections[collection].config.versions,
      targetLng,
    });

    // Unconditional: with no drafts Payload has no version to substitute and returns the only row.
    const [sourceData, currentTargetVersion] = await Promise.all([
      fetchSourceDocument(payload, collection, collectionId, sourceLng, scope),
      payload.findByID({
        req: freshReq(scope),
        collection,
        id: collectionId,
        locale: targetLng,
        fallbackLocale: false,
        depth: 0,
        draft: true,
      }),
    ]);

    // Placed ahead of the provider call so a refusal costs no money: a retry re-asks instead of
    // re-buying a translation the write will refuse. `sourceData` stands in for the write payload — a
    // rule keyed on the *translated* values is still enforced at the write on the deferred path.
    const permission = await checkTranslationPermission({
      payload,
      collection,
      id: String(collectionId),
      data: sourceData as Record<string, unknown>,
      targetLocale: targetLng,
      scope,
    });
    if (!permission.allowed) throw new TranslationRefused(collection, targetLng);

    const provenance = this.provenanceServiceFactory?.(payload, scope);
    const sourceFingerprint = provenance?.captureFingerprint(collection, sourceData) ?? null;

    const translatedData = await translateContent({
      schema,
      sourceData,
      targetData: currentTargetVersion,
      sourceLng,
      targetLng,
      translationProvider: this.translationProvider,
      strategy,
      inlineMarks: this.inlineMarks,
    });

    if (translatedData) {
      await this.refuseUnlessAllowed(payload, input, translatedData, scope, permission);
      await this.saveTranslatedDocument(
        payload,
        input,
        translatedData,
        layer.write,
        scope,
        permission
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
    }

    if (publishOnTranslation && layer.kind === "drafts") {
      const status = { _status: layer.publish.status };
      await this.refuseUnlessAllowed(payload, input, status, scope, permission);
      await this.publishTargetLocale(payload, input, layer.publish, scope, permission);
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
    permission: TranslationPermission
  ): Promise<void> {
    if (!permission.user) return;
    const allowed = await mayWrite({
      payload,
      collection: input.collection,
      id: String(input.collectionId),
      data,
      targetLocale: input.targetLng,
      scope,
      user: permission.user,
    });
    if (!allowed) throw new TranslationRefused(input.collection, input.targetLng);
  }

  private async saveTranslatedDocument(
    payload: Payload,
    input: TranslateDocumentInput,
    translatedData: Record<string, unknown>,
    write: TargetLayer["write"],
    scope: RequestScope,
    permission: TranslationPermission
  ): Promise<void> {
    await payload.update({
      req: freshReq(scope),
      ...enforcedAtTheWrite(permission),
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
    permission: TranslationPermission
  ): Promise<void> {
    await payload.update({
      req: freshReq(scope),
      ...enforcedAtTheWrite(permission),
      collection: input.collection,
      id: input.collectionId,
      data: { _status: publish.status },
      publishSpecificLocale: publish.publishSpecificLocale,
      locale: publish.publishSpecificLocale,
      context: translatorWriteContext(),
    });
  }
}
