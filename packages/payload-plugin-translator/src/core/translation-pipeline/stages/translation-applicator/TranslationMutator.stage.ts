import { TranslatorBug } from "../../../errors/index.js";
import { applyTranslations } from "../../../traversal/index.js";
import type { TranslationAnswer } from "../../../traversal/index.js";
import type { PipelineContext, PipelineStage, SettledAnswer } from "../../types/index.js";

const answerFor = (settled: SettledAnswer | undefined): TranslationAnswer | undefined => {
  if (settled === undefined || settled.kind === "failed") return undefined;
  return settled.kind === "text" ? settled.text : settled.segments;
};

/**
 * Applies translations to data via mutation.
 */
export class TranslationMutatorStage implements PipelineStage {
  execute(ctx: PipelineContext): PipelineContext {
    if (!ctx.collected) {
      throw new TranslatorBug("TranslationMutatorStage requires what the walk collected");
    }

    const answers = ctx.answers ?? {};
    applyTranslations(
      ctx.collected,
      ctx.collected.targets.map((_target, index) => answerFor(answers[index]))
    );
    return ctx;
  }
}
