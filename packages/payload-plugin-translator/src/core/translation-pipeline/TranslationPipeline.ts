import type { IdPath } from "../domain/content-projection/idPath.js";
import type { TranslationProvider } from "../domain/translation-providers/index.js";
import type { LeafFailure, LeafOutcome, SettledAnswer } from "./types/index.js";
import type {
  PipelineConfig,
  PipelineResult,
  PipelineContext,
  PipelineStage,
} from "./types/index.js";
import { DataReconcilerStage, TranslationStage, TranslationMutatorStage } from "./stages/index.js";
import { WalkCollectorStage } from "./stages/walk-collector/WalkCollector.stage.js";

function leafOutcomes(
  sent: readonly IdPath[],
  answers: Record<number, SettledAnswer>
): LeafOutcome[] {
  const failed = new Map<IdPath, LeafFailure[]>();
  for (const [index, idPath] of sent.entries()) {
    const leaf = failed.get(idPath) ?? [];
    const answer = answers[index];
    if (answer?.kind === "failed") leaf.push(answer.failure);
    failed.set(idPath, leaf);
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
      new WalkCollectorStage(),
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
      languages: config.languages,
      hostLanguageId: config.hostLanguageId,
    };

    for (const stage of this.stages) {
      ctx = await stage.execute(ctx);

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
      leaves: leafOutcomes(ctx.sentAddresses ?? [], ctx.answers ?? {}),
    };
  }
}
