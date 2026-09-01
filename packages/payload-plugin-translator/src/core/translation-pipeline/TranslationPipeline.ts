import type { TranslationProvider } from "../domain/translation-providers";
import type { PipelineConfig, PipelineResult, PipelineContext, PipelineStage } from "./types";
import type { TranslationStrategy } from "./strategies";
import type { TextExpander } from "./stages";
import {
  DataReconcilerStage,
  FieldChunkCollectorStage,
  TranslationStage,
  TextChunkExpanderStage,
  TranslationMutatorStage,
} from "./stages";

/**
 * Options for TranslationPipeline.
 */
export type TranslationPipelineOptions = {
  translationProvider: TranslationProvider;
  translationStrategy: TranslationStrategy;
  textExpanders?: TextExpander[];
};

/**
 * Main orchestrator for the translation pipeline.
 * Coordinates all stages in sequence via PipelineContext.
 *
 * Pipeline stages:
 * 1. DataReconcilerStage - Reconcile source/target data preserving full document shape
 * 2. FieldChunkCollectorStage - Collect FieldChunks (schema-aware)
 * 3. TextChunkExpanderStage - Expand FieldChunks to TextChunks (schema-free)
 * 4. TranslationStage - Call translation provider
 * 5. TranslationMutatorStage - Apply translations via mutation
 *
 * Pipeline only transforms data. Saving is the caller's responsibility.
 */
export class TranslationPipeline {
  private readonly stages: PipelineStage[];

  constructor(options: TranslationPipelineOptions) {
    this.stages = [
      new DataReconcilerStage(),
      new FieldChunkCollectorStage(options.translationStrategy),
      new TextChunkExpanderStage(options.textExpanders),
      new TranslationStage(options.translationProvider),
      new TranslationMutatorStage(),
    ];
  }

  /**
   * Executes the translation pipeline.
   * Returns transformed data ready to be saved, or null if nothing to translate.
   */
  async execute(config: PipelineConfig): Promise<PipelineResult | null> {
    let ctx: PipelineContext = {
      schema: config.schema,
      sourceData: config.sourceData,
      targetData: config.targetData,
      existingTranslation: config.existingTranslation ?? config.targetData,
      sourceLng: config.sourceLng,
      targetLng: config.targetLng,
    };

    for (const stage of this.stages) {
      ctx = await stage.execute(ctx);

      // Nothing left to translate — but that is not the same as nothing to write. When the
      // strategy declined a leaf whose translation lives in a layer the write cannot see, that
      // value was carried into `filteredData` and still owes a write. Either way the remaining
      // stages are skipped: there is no text to send and nothing to apply.
      // Nothing was selected to translate — but a carried leaf still owes a write.
      if (ctx.fieldChunks !== undefined && ctx.fieldChunks.length === 0) {
        const carried = (ctx.carriedCount ?? 0) > 0;
        return carried && ctx.filteredData ? { translatedData: ctx.filteredData } : null;
      }
      // Leaves WERE selected and produced no text. The collector has already written their raw
      // source values into `filteredData`, so returning it here would persist untranslated source
      // as if it were a translation — a carry elsewhere in the document does not license that.
      if (ctx.textMap !== undefined && Object.keys(ctx.textMap).length === 0) {
        return null;
      }
    }

    if (!ctx.filteredData) {
      return null;
    }

    return {
      translatedData: ctx.filteredData,
    };
  }
}
