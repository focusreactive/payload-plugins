import { TranslatorBug } from "../../../errors/index.js";
import type { PipelineContext, PipelineStage } from "../../types/index.js";
import { writeAnswers } from "./writeAnswers.js";

/**
 * Applies translations to data via mutation.
 */
export class TranslationMutatorStage implements PipelineStage {
  execute(ctx: PipelineContext): PipelineContext {
    if (!ctx.textChunks || !ctx.answers) {
      throw new TranslatorBug("TranslationMutatorStage requires textChunks and answers");
    }

    const notWritten = writeAnswers(ctx.textChunks, ctx.answers);

    return { ...ctx, notWritten };
  }
}
