import type { FieldLike } from "../kernel/field-traversal/index.js";
import type {
  DocumentRef,
  LanguageCode,
  TranslationProvider,
} from "../domain/translation-providers/index.js";
import { TranslationPipeline } from "./TranslationPipeline.js";
import type { LeafAddress } from "../domain/content-projection/idPath.js";
import type { PipelineResult } from "./types/Pipeline.js";
import type { RegisteredLanguage } from "../traversal/index.js";

export type TranslateContentArgs = {
  schema: FieldLike[];
  /** Source values, rooted to match `schema` (e.g. `{ [fieldName]: value }`). */
  sourceData: Record<string, unknown>;
  /**
   * Existing target-locale values; a leaf outside `selection` keeps its text. Defaults to `{}`.
   */
  targetData?: Record<string, unknown>;
  sourceLng: LanguageCode;
  targetLng: LanguageCode;
  document: DocumentRef;
  translationProvider: TranslationProvider;
  /** The leaf addresses to translate, as {@link makeIdPath} mints them. */
  selection: readonly LeafAddress[];
  languages: readonly RegisteredLanguage[];
  hostLanguageId: string;
};

export type TranslatedContent = PipelineResult;

/**
 * Translate a content object over a schema subtree — pure: no DB, no document.
 *
 * Only the `selection`'s leaves are translated, and only where the schema says they are
 * translatable; everything else is reconciled through unchanged.
 */
export async function translateContent({
  schema,
  sourceData,
  targetData = {},
  sourceLng,
  targetLng,
  document,
  translationProvider,
  selection,
  languages,
  hostLanguageId,
}: TranslateContentArgs): Promise<TranslatedContent> {
  const pipeline = new TranslationPipeline({ translationProvider });

  return await pipeline.execute({
    schema,
    sourceData,
    targetData,
    sourceLng,
    targetLng,
    document,
    selection,
    languages,
    hostLanguageId,
  });
}
