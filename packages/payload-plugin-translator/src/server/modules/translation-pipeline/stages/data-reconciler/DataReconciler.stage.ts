import type { PipelineContext, PipelineStage } from "../../types";
import { DataReconciler } from "./DataReconciler";

/**
 * Deep merges source and target data with target priority.
 * Stage 1 of the translation pipeline.
 */
export class DataReconcilerStage implements PipelineStage {
  execute(ctx: PipelineContext): PipelineContext {
    const reconciler = new DataReconciler(ctx.schema);
    return {
      ...ctx,
      filteredData: reconciler.reconcile(ctx.sourceData, ctx.targetData),
    };
  }
}
