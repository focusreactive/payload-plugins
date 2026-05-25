import type { FieldChunk, PlainTextChunk } from '../../types'
import type { ExpansionResult, TextExpander } from './TextExpander.interface'

/**
 * Expands plain text and textarea fields into PlainTextChunks.
 */
export class PlainTextExpander implements TextExpander {
  canExpand(_chunk: FieldChunk, value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0
  }

  expand(chunk: FieldChunk, value: unknown, startIndex: number): ExpansionResult {
    const text = value as string

    const textChunk: PlainTextChunk = {
      type: 'plain',
      index: startIndex,
      text,
      dataRef: chunk.dataRef,
      key: chunk.key,
    }

    return {
      chunks: [textChunk],
      textMap: { [startIndex]: text },
      nextIndex: startIndex + 1,
    }
  }
}
