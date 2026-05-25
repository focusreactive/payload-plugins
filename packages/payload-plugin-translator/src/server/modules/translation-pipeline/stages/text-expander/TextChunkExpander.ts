import type { FieldChunk, TextChunk } from '../../types'
import type { TextExpander } from './TextExpander.interface'

/**
 * Result of text chunk expansion.
 */
export type TextExpansionResult = {
  /** All text chunks ready for translation */
  textChunks: TextChunk[]
  /** Map of index -> original text for translation API */
  textMap: Record<number, string>
}

/**
 * Expands FieldChunks into TextChunks.
 * This is where schema dependency ends - TextChunks contain only data references.
 */
export class TextChunkExpander {
  constructor(private readonly expanders: TextExpander[]) {}

  /**
   * Expands all FieldChunks into TextChunks.
   */
  expand(fieldChunks: FieldChunk[]): TextExpansionResult {
    const textChunks: TextChunk[] = []
    const textMap: Record<number, string> = {}
    let currentIndex = 0

    for (const fieldChunk of fieldChunks) {
      const value = fieldChunk.dataRef[fieldChunk.key]

      for (const expander of this.expanders) {
        if (expander.canExpand(fieldChunk, value)) {
          const result = expander.expand(fieldChunk, value, currentIndex)
          textChunks.push(...result.chunks)
          Object.assign(textMap, result.textMap)
          currentIndex = result.nextIndex
          break
        }
      }
    }

    return { textChunks, textMap }
  }
}
