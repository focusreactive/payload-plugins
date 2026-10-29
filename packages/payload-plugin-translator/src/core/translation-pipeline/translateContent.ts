import type { FieldLike } from "../kernel/field-traversal/index.js";
import type { DocumentRef, TranslationProvider } from "../domain/translation-providers/index.js";
import { TranslationPipeline } from "./TranslationPipeline.js";
import type { LeafAddress } from "../domain/content-projection/idPath.js";
import { PlainTextExpander, RichContainerExpander } from "./stages/index.js";
import type { PipelineResult } from "./types/Pipeline.js";

export type TranslateContentArgs = {
  schema: FieldLike[];
  /** Source values, rooted to match `schema` (e.g. `{ [fieldName]: value }`). */
  sourceData: Record<string, unknown>;
  /**
   * Existing target-locale values; a leaf outside `selection` keeps its text. Defaults to `{}`.
   */
  targetData?: Record<string, unknown>;
  /** Source language code, or `''` for provider auto-detect. */
  sourceLng: string;
  targetLng: string;
  document: DocumentRef;
  translationProvider: TranslationProvider;
  /** The leaf addresses to translate, as {@link makeIdPath} mints them. */
  selection: readonly LeafAddress[];
};

export type TranslatedContent = PipelineResult;

/**
 * Translate a content object over a schema subtree — pure: no DB, no document.
 *
 * Only the `selection`'s leaves are translated, and only where the schema says they are
 * translatable; everything else is reconciled through unchanged. `null` when nothing was sent.
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
}: TranslateContentArgs): Promise<TranslatedContent | null> {
  const marksUsable = translationProvider.capabilities?.inlineMarks === true;

  const pipeline = new TranslationPipeline({
    translationProvider,
    textExpanders: marksUsable ? [new RichContainerExpander(), new PlainTextExpander()] : undefined,
  });

  return await pipeline.execute({
    schema,
    sourceData,
    targetData,
    sourceLng,
    targetLng,
    document,
    selection,
  });
}
