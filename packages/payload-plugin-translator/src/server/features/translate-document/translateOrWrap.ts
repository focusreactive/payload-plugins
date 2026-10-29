import { APIError } from "payload";

import { asTranslatorError } from "../../../translation-providers/shared/errors/index.js";
import type { LeafAddress } from "../../../core/domain/content-projection/idPath.js";
import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import { translateContent } from "../../../core/translation-pipeline/index.js";
import type { Run } from "./run.js";
import type { ApprovedSource } from "./targetDocument.js";

/**
 * Wrapped as ours, or `mustPropagate` takes a provider outage for a rolled-back Payload write and
 * reports a lost save. An `APIError` stays as it is: it may come from a Payload operation the
 * provider ran, which has already rolled the caller's transaction back.
 */
export async function translateOrWrap(args: {
  run: Run;
  translationProvider: TranslationProvider;
  source: ApprovedSource;
  selection: readonly LeafAddress[];
}): Promise<Awaited<ReturnType<typeof translateContent>>> {
  const { run, translationProvider, source, selection } = args;

  try {
    return await translateContent({
      schema: run.schema,
      sourceData: source.sourceData,
      targetData: source.currentTarget,
      sourceLng: run.target.sourceLocale,
      targetLng: run.target.targetLocale,
      document: { collection: run.target.collection, id: run.target.documentId },
      translationProvider,
      selection,
    });
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw asTranslatorError(error);
  }
}
