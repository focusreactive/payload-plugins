import type { FieldLike } from "../kernel/field-traversal/index.js";
import type { TranslationProvider } from "../domain/translation-providers/index.js";
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
   * Existing target-locale values to reconcile against (target wins when
   * non-empty under `skip_existing`). Defaults to `{}` — i.e. translate the
   * source in place (`overwrite`).
   */
  targetData?: Record<string, unknown>;
  /** Source language code, or `''` for provider auto-detect. */
  sourceLng: string;
  targetLng: string;
  translationProvider: TranslationProvider;
  /** @default 'overwrite' */
  strategy?: TranslationStrategyName;
  sourceChangedByLeaf?: ChangedLeaves;
  /**
   * Translate each rich-text container as one marked string instead of node by node, so the model
   * may reorder its pieces. Silently ignored unless the provider declares `capabilities.inlineMarks`.
   *
   * @default false
   */
  inlineMarks?: boolean;
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
  translationProvider,
  strategy = "overwrite",
  inlineMarks = false,
  sourceChangedByLeaf,
}: TranslateContentArgs): Promise<TranslatedContent | null> {
  const marksUsable = inlineMarks && translationProvider.capabilities?.inlineMarks === true;

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
    sourceChangedByLeaf,
  });
}
