import type { PipelineContext, PipelineStage } from '../../types'
import type { TranslationProvider } from '../../../translation-providers'

/**
 * Calls translation provider to translate text.
 */
export class TranslationStage implements PipelineStage {
  constructor(private readonly provider: TranslationProvider) {}

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    if (!ctx.textMap || Object.keys(ctx.textMap).length === 0) {
      return ctx
    }

    const translations = await this.provider.translate(ctx.textMap, ctx.sourceLng, ctx.targetLng)

    if (!translations) {
      throw new Error('Translation provider returned null')
    }

    return {
      ...ctx,
      translations,
    }
  }
}
