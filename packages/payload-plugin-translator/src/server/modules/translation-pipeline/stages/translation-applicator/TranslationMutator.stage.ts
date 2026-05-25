import type { PipelineContext, PipelineStage } from '../../types'
import { TranslationMutator } from './TranslationMutator'

/**
 * Applies translations to data via mutation.
 */
export class TranslationMutatorStage implements PipelineStage {
  execute(ctx: PipelineContext): PipelineContext {
    if (!ctx.textChunks || !ctx.translations) {
      throw new Error('TranslationMutatorStage requires textChunks and translations')
    }

    const mutator = new TranslationMutator()
    mutator.apply(ctx.textChunks, ctx.translations)

    return ctx
  }
}
