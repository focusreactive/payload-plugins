import type { TranslationProvider } from "../translation-providers";
import type { TextExpander } from "./stages";
import {
  DataReconcilerStage,
  FieldChunkCollectorStage,
  TranslationStage,
  TextChunkExpanderStage,
  TranslationMutatorStage,
} from "./stages";
import type { TranslationStrategy } from "./strategies";
import type {
  PipelineConfig,
  PipelineResult,
  PipelineContext,
  PipelineStage,
} from "./types";

/**
 * Options for TranslationPipeline.
 */
export interface TranslationPipelineOptions {
  translationProvider: TranslationProvider;
  translationStrategy: TranslationStrategy;
  textExpanders?: TextExpander[];
}

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
      sourceLng: config.sourceLng,
      targetData: config.targetData,
      targetLng: config.targetLng,
    };

    for (const stage of this.stages) {
      ctx = await stage.execute(ctx);

      // Early exit checks
      if (ctx.fieldChunks !== undefined && ctx.fieldChunks.length === 0) {
        return null;
      }
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
