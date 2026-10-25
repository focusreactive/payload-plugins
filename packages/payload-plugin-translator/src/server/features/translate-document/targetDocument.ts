import type { Payload } from "payload";

import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../types/AutoTranslateContext.js";
import type { RunTarget } from "../../modules/translation-run/index.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { freshReq } from "../../shared/payload/RequestScope.shapes.js";
import { enforcedAtTheRead } from "../../shared/payload/enforcedAtTheRead.js";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument.js";
import { SourceUnreadable } from "./SourceUnreadable.js";
import { TranslationRefused } from "./TranslationRefused.js";
import { checkTranslationPermission, mayWrite, rebuildRequester } from "./translationPermission.js";
import type { RebuiltRequester } from "./translationPermission.js";
import type { PublishScope, WriteLayer } from "./targetLayer.js";

export type BothLocales = {
  readonly sourceData: Record<string, unknown>;
  readonly currentTarget: Record<string, unknown>;
};

declare const asked: unique symbol;

/**
 * The only value {@link sendToPayload} accepts, and `approveWrite` is the only thing that mints
 * one — it asks the collection's rules about exactly this data, or asks nothing when there is no
 * requester. The key is a symbol this module never exports, so unlike a string brand no literal
 * can name it.
 */
export type ApprovedWrite = Record<string, unknown> & { readonly [asked]: true };

type WriteDestination =
  | ({
      readonly locale: string;
      readonly fallbackLocale: string;
      readonly publishSpecificLocale?: never;
    } & WriteLayer)
  | {
      readonly locale: string;
      readonly publishSpecificLocale: string;
      readonly fallbackLocale?: never;
      readonly draft?: never;
      readonly autosave?: never;
    };

/**
 * Payload strips a field the requester may not write rather than throwing
 * (`fields/hooks/beforeValidate/promise.js`); the collection's own `update` rule does throw, which
 * is why `approveWrite` asks before the write is sent. With nobody to name, the write is unchecked.
 */
function enforcedAtTheWrite(
  requester: RebuiltRequester | null
): { overrideAccess: false; user: RebuiltRequester } | Record<string, never> {
  if (!requester) return {};
  return { overrideAccess: false, user: requester };
}

/**
 * The run's target document, read and written under the requester's access — and under none at
 * all, when the request named nobody.
 */
export type TargetDocument = {
  readBothLocales(): Promise<BothLocales>;
  refuseUnlessTranslationAllowed(sourceData: Record<string, unknown>): Promise<void>;
  saveTranslation(data: Record<string, unknown>, write: WriteLayer): Promise<void>;
  publish(scope: PublishScope): Promise<void>;
};

export async function openTargetDocument(args: {
  payload: Payload;
  target: RunTarget;
  scope: RequestScope;
}): Promise<TargetDocument> {
  const { payload, target, scope } = args;
  const { collection, documentId, sourceLocale, targetLocale } = target;
  const requester = await rebuildRequester(payload, scope);

  const permissionQuery = (data: Record<string, unknown>) => ({
    payload,
    collection,
    id: String(documentId),
    targetLocale,
    scope,
    user: requester,
    data,
  });

  /**
   * Asked with exactly the payload about to be sent: the same rule refusing at the write
   * (`updateByID`) is a `Forbidden` inside the caller's transaction — on the inline path, the
   * editor's own save.
   */
  const approveWrite = async (data: Record<string, unknown>): Promise<ApprovedWrite> => {
    if (requester) {
      const allowed = await mayWrite({ ...permissionQuery(data), user: requester });
      if (!allowed) throw new TranslationRefused(collection, targetLocale);
    }
    return data as ApprovedWrite;
  };

  const sendToPayload = (data: ApprovedWrite, where: WriteDestination) =>
    payload.update({
      req: freshReq(scope),
      ...enforcedAtTheWrite(requester),
      collection,
      id: documentId,
      context: { [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true },
      data,
      ...where,
    });

  return {
    async readBothLocales() {
      const [sourceData, currentTarget] = await Promise.all([
        fetchSourceDocument({
          payload,
          collection,
          id: String(documentId),
          locale: sourceLocale,
          user: requester,
          scope,
        }),
        payload.findByID({
          req: freshReq(scope),
          collection,
          id: documentId,
          locale: targetLocale,
          fallbackLocale: false,
          depth: 0,
          ...enforcedAtTheRead(requester),
          draft: true,
        }),
      ]);
      if (!sourceData) throw new SourceUnreadable(collection, sourceLocale);
      if (!currentTarget) throw new SourceUnreadable(collection, targetLocale);

      return { sourceData, currentTarget };
    },

    async refuseUnlessTranslationAllowed(sourceData) {
      const allowed = await checkTranslationPermission(permissionQuery(sourceData));
      if (!allowed) throw new TranslationRefused(collection, targetLocale);
    },

    async saveTranslation(data, write) {
      await sendToPayload(await approveWrite(data), {
        ...write,
        locale: targetLocale,
        fallbackLocale: sourceLocale,
      });
    },

    async publish({ status, publishSpecificLocale }) {
      await sendToPayload(await approveWrite({ _status: status }), {
        publishSpecificLocale,
        locale: publishSpecificLocale,
      });
    },
  };
}
