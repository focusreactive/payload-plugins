import type { FieldLike } from "../kernel/field-traversal/index.js";
import type { DocumentRef, TranslationProvider } from "../domain/translation-providers/index.js";
import { TranslationPipeline } from "./TranslationPipeline.js";
import { PlainTextExpander, RichContainerExpander } from "./stages/index.js";
import { createTranslationStrategy } from "./strategies/index.js";
import type { TranslationStrategyName } from "./strategies/index.js";
import type { PipelineResult } from "./types/Pipeline.js";
import type { ChangedLeaves } from "../domain/provenance/staleness.js";

export type TranslateContentArgs = {
  /** Schema subtree to translate (e.g. `[declaredFieldConfig]`). */
  schema: FieldLike[];
  /** Source values, rooted to match `schema` (e.g. `{ [fieldName]: value }`). */
  sourceData: Record<string, unknown>;
  /**
   * Existing target-locale values to reconcile against (under `skip_existing` a non-empty target
   * wins unless `sourceChangedByLeaf` marks its leaf). Defaults to `{}` — i.e. translate the
   * source in place (`overwrite`).
   */
  targetData?: Record<string, unknown>;
  /** Source language code, or `''` for provider auto-detect. */
  sourceLng: string;
  targetLng: string;
  /** Told to the provider so a `systemPrompt` builder can scope itself. */
  document: DocumentRef;
  translationProvider: TranslationProvider;
  /** @default 'overwrite' */
  strategy?: TranslationStrategyName;
  sourceChangedByLeaf?: ChangedLeaves;
};

export type TranslatedContent = PipelineResult;

/**
 * Translate a content object over a schema subtree — pure: no DB, no document.
 *
 * Only `localized` text/richText leaves are translated; everything else is reconciled through
 * unchanged. `null` when the subtree held nothing translatable.
 */
export async function translateContent({
  schema,
  sourceData,
  targetData = {},
  sourceLng,
  targetLng,
  document,
  translationProvider,
  strategy = "overwrite",
  sourceChangedByLeaf,
}: TranslateContentArgs): Promise<TranslatedContent | null> {
  const marksUsable = translationProvider.capabilities?.inlineMarks === true;

  const pipeline = new TranslationPipeline({
    translationProvider,
    translationStrategy: createTranslationStrategy(strategy),
    textExpanders: marksUsable ? [new RichContainerExpander(), new PlainTextExpander()] : undefined,
  });

  return await pipeline.execute({
    schema,
    sourceData,
    targetData,
    sourceLng,
    targetLng,
    document,
    sourceChangedByLeaf,
  });
}
