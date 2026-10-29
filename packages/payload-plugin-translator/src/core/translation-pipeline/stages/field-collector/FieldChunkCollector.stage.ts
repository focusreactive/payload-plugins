import { TranslatorBug } from "../../../errors/index.js";
import type { PipelineContext, PipelineStage } from "../../types/index.js";
import { FieldChunkCollector } from "./FieldChunkCollector.js";

/**
 * Collects the FieldChunks the run will send: every leaf of the selection whose source is not
 * empty. Stage 2 of the translation pipeline.
 */
export class FieldChunkCollectorStage implements PipelineStage {
  execute(ctx: PipelineContext): PipelineContext {
    if (!ctx.reconciledData) {
      throw new TranslatorBug(
        "FieldChunkCollectorStage requires reconciledData from previous stage"
      );
    }

    const collector = new FieldChunkCollector(
      ctx.schema,
      ctx.reconciledData,
      ctx.sourceData,
      ctx.selection
    );
    return {
      ...ctx,
      fieldChunks: collector.collect(),
    };
  }
}
