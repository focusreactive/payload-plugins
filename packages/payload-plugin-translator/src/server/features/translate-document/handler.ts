import type { Payload } from "payload";
import { APIError } from "payload";

import type { Handler } from "../../shared";
import type { TranslationProvider } from "../../../core/domain/translation-providers";
import { translateContent } from "../../../core/translation-pipeline";
import type { ProvenanceServiceFactory } from "../../modules/provenance";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes";
import { freshReq } from "../../shared/payload/RequestScope.shapes";
import { checkTranslationPermission } from "../../shared/payload/translationPermission";
import type { TranslationPermission } from "../../shared/payload/translationPermission";
import { TranslationRefused } from "../../shared/payload/TranslationRefused";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../types/AutoTranslateContext";
import type { TranslateDocumentInput, TranslateDocumentOutput } from "./model";
import { resolveTargetLayer } from "./targetLayer";
import type { PublishScope, TargetLayer } from "./targetLayer";

/** Loop guard: the auto-translate afterChange hook (#51) skips writes carrying this key. */
const translatorWriteContext = () => ({ [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true });

/**
 * Whether this write can afford Payload's own enforcement on top of the pre-check.
 *
 * It can exactly when there is no caller transaction to damage — the deferred path, where the job
 * runs on a request of its own, long after the save that queued it committed. There, a refusal
 * Payload raises costs nothing but the translation. On the inline path a caller transaction is
 * present and `killTransaction` would take the editor's save with it, so the pre-check stands alone;
 * that is the whole reason it exists.
 */
function enforcedAtTheWrite(
  scope: RequestScope,
  permission: TranslationPermission
): { overrideAccess: false; user: Record<string, unknown> } | Record<string, never> {
  if (scope.transactionID != null || !permission.user) return {};
  return { overrideAccess: false, user: permission.user };
}

function dropPath(value: unknown, segments: string[]): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((row) => dropPath(row, segments));

  const [head, ...rest] = segments;
  const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    if (key !== head) return [[key, child] as const];
    if (rest.length === 0) return [];
    return [[key, dropPath(child, rest)] as const];
  });
  return Object.fromEntries(entries);
}

/**
 * Drop the paths the rules refuse and keep everything else.
 *
 * A refused field is a reason to leave that field alone, not to abandon the locale — so a rule on
 * `meta.subtitle` must not cost `meta.headline` its translation. Paths are dot-separated and an array
 * is pruned row by row, because a row's fields share one rule.
 */
function withoutDeniedFields(
  data: Record<string, unknown>,
  denied: string[]
): Record<string, unknown> {
  if (denied.length === 0) return data;
  return denied.reduce<Record<string, unknown>>(
    (acc, path) => dropPath(acc, path.split(".")) as Record<string, unknown>,
    data
  );
}

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

    // `draft: true` is unconditional: on a collection without drafts Payload has no version to
    // substitute, so it returns the only row. The write cannot be as relaxed — the `no-drafts`
    // layer omits `draft` entirely.
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

    // Ask before spending, not just before writing. Asking is what protects the caller's save —
    // attempting the write and catching the refusal would let Payload's `killTransaction` roll back
    // whatever transaction the request carries. Asking *here*, ahead of the provider call, also means
    // a refusal costs nothing: the job's retries re-ask instead of re-buying a translation the write
    // will refuse anyway. The source document stands in for the data, which is what a rule keyed on
    // the document can read; the deferred path writes with `overrideAccess: false` as well, so a rule
    // that keys on the translated values still gets its say there.
    const permission = await checkTranslationPermission({
      payload,
      collection,
      id: String(collectionId),
      data: sourceData as Record<string, unknown>,
      locale: targetLng,
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
      const writable = withoutDeniedFields(translatedData, permission.deniedFields);
      if (Object.keys(writable).length === 0) {
        throw new TranslationRefused(collection, targetLng);
      }

      await this.saveTranslatedDocument(payload, input, writable, layer.write, scope, permission);

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

    // No gate of its own: `_status` is one of Payload's base version fields and declares no access,
    // so it inherits the collection's — and a collection that refuses the update has already been
    // refused above. A publish the rules would object to cannot reach this line.
    if (publishOnTranslation && layer.kind === "drafts") {
      await this.publishTargetLocale(payload, input, layer.publish, scope, permission);
    }

    return { success: true };
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
      ...enforcedAtTheWrite(scope, permission),
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
      ...enforcedAtTheWrite(scope, permission),
      collection: input.collection,
      id: input.collectionId,
      data: { _status: publish.status },
      publishSpecificLocale: publish.publishSpecificLocale,
      locale: publish.publishSpecificLocale,
      context: translatorWriteContext(),
    });
  }
}
