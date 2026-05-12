import type { PipelineContext, PipelineStage } from '../../types'
import type { TextExpander } from './TextExpander.interface'
import { TextChunkExpander } from './TextChunkExpander'
import { RichTextExpander } from './RichTextExpander'
import { PlainTextExpander } from './PlainTextExpander'

const defaultExpanders: TextExpander[] = [new RichTextExpander(), new PlainTextExpander()]

/**
 * Expands FieldChunks to TextChunks (schema-free).
 */
export class TextChunkExpanderStage implements PipelineStage {
  constructor(private readonly expanders: TextExpander[] = defaultExpanders) {}

  execute(ctx: PipelineContext): PipelineContext {
    if (!ctx.fieldChunks) {
      throw new Error('TextChunkExpanderStage requires fieldChunks from previous stage')
    }

    const expander = new TextChunkExpander(this.expanders)
    const { textChunks, textMap } = expander.expand(ctx.fieldChunks)

    return {
      ...ctx,
      textChunks,
      textMap,
    }
  }
}
