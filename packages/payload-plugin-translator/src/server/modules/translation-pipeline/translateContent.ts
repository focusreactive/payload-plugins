import type { Field } from "payload";

import type { TranslationProvider } from "../translation-providers";
import { TranslationPipeline } from "./TranslationPipeline";
import { createTranslationStrategy } from "./strategies";
import type { TranslationStrategyName } from "./strategies";

export type TranslateContentArgs = {
  /** Schema subtree to translate (e.g. `[declaredFieldConfig]`). */
  schema: Field[];
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
};

/**
 * Translate a content object over a schema subtree — no DB, no document.
 *
 * A thin reusable entry over {@link TranslationPipeline}, which is already pure
 * and walks any `Field[]` + matching data (a subtree + partial data works
 * unchanged). The document level routes through this wrapper today (instead of
 * constructing the pipeline inline); the upcoming field level will too —
 * passing a single declared field's subtree + its current unsaved form value.
 *
 * Only `localized` text/richText leaves are translated; non-localized values
 * are reconciled through unchanged. Returns the translated data (same shape as
 * `sourceData`) or `null` when nothing was translatable.
 */
export async function translateContent({
  schema,
  sourceData,
  targetData = {},
  sourceLng,
  targetLng,
  translationProvider,
  strategy = "overwrite",
}: TranslateContentArgs): Promise<Record<string, unknown> | null> {
  const pipeline = new TranslationPipeline({
    translationProvider,
    translationStrategy: createTranslationStrategy(strategy),
  });

  const result = await pipeline.execute({
    schema,
    sourceData,
    targetData,
    sourceLng,
    targetLng,
  });

  return result ? result.translatedData : null;
}
