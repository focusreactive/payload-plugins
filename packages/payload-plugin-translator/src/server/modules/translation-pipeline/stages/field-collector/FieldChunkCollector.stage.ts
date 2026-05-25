import type { TranslationStrategy } from "../../strategies";
import type { PipelineContext, PipelineStage } from "../../types";
import { FieldChunkCollector } from "./FieldChunkCollector";

/**
 * Collects FieldChunks with schema metadata and data references.
 * Applies all filtering logic including strategy.shouldTranslate().
 * Stage 2 of the translation pipeline.
 */
export class FieldChunkCollectorStage implements PipelineStage {
  constructor(private readonly strategy: TranslationStrategy) {}

  execute(ctx: PipelineContext): PipelineContext {
    if (!ctx.filteredData) {
      throw new Error(
        "FieldChunkCollectorStage requires filteredData from previous stage"
      );
    }

    const collector = new FieldChunkCollector(
      ctx.schema,
      ctx.filteredData,
      ctx.sourceData,
      ctx.targetData,
      this.strategy
    );
    return {
      ...ctx,
      fieldChunks: collector.collect(),
    };
  }
}
