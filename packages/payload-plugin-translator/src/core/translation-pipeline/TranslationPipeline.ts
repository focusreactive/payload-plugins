import type { IdPath } from "../domain/content-projection/idPath.js";
import type { TranslationProvider } from "../domain/translation-providers/index.js";
import type { LeafFailure, LeafOutcome, SettledAnswer, TextChunk } from "./types/index.js";
import type {
  PipelineConfig,
  PipelineResult,
  PipelineContext,
  PipelineStage,
} from "./types/index.js";
import {
  DataReconcilerStage,
  FieldChunkCollectorStage,
  TranslationStage,
  TextChunkExpanderStage,
  TranslationMutatorStage,
} from "./stages/index.js";

function leafOutcomes(
  sent: TextChunk[],
  notWritten: ReadonlySet<number>,
  answers: Record<number, SettledAnswer>
): LeafOutcome[] {
  const failed = new Map<IdPath, LeafFailure[]>();
  for (const chunk of sent) {
    const leaf = failed.get(chunk.idPath) ?? [];
    const answer = answers[chunk.index];
    if (answer?.kind === "failed") leaf.push(answer.failure);
    else if (notWritten.has(chunk.index)) leaf.push({ code: "not-written" });
    failed.set(chunk.idPath, leaf);
  }

  return [...failed].map(([idPath, leafFailures]) =>
    leafFailures.length === 0
      ? { idPath, answered: true }
      : { idPath, answered: false, failures: leafFailures }
  );
}

export type TranslationPipelineOptions = {
  translationProvider: TranslationProvider;
};

/** Only transforms data; saving the result is the caller's responsibility. */
export class TranslationPipeline {
  private readonly stages: PipelineStage[];

  constructor(options: TranslationPipelineOptions) {
    this.stages = [
      new DataReconcilerStage(),
      new FieldChunkCollectorStage(),
      new TextChunkExpanderStage(),
      new TranslationStage(options.translationProvider),
      new TranslationMutatorStage(),
    ];
  }

  async execute(config: PipelineConfig): Promise<PipelineResult> {
    let ctx: PipelineContext = {
      schema: config.schema,
      sourceData: config.sourceData,
      targetData: config.targetData,
      sourceLng: config.sourceLng,
      targetLng: config.targetLng,
      document: config.document,
      selection: config.selection,
    };

    for (const stage of this.stages) {
      ctx = await stage.execute(ctx);

      if (ctx.fieldChunks !== undefined && ctx.fieldChunks.length === 0) {
        return { sent: false };
      }
      if (ctx.textMap !== undefined && Object.keys(ctx.textMap).length === 0) {
        return { sent: false };
      }
    }

    if (!ctx.reconciledData) {
      return { sent: false };
    }

    return {
      sent: true,
      translatedData: ctx.reconciledData,
      leaves: leafOutcomes(ctx.textChunks ?? [], ctx.notWritten ?? new Set(), ctx.answers ?? {}),
    };
  }
}
