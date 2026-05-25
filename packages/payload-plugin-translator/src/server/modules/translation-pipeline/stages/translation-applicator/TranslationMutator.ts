import type { TextChunk } from '../../types'
import { isPlainTextChunk, isRichTextChunk } from '../../types'

/**
 * Applies translations by mutating data through TextChunk references.
 * This is the simplest stage - just direct mutation.
 *
 * Stage 5 of the translation pipeline.
 */
export class TranslationMutator {
  /**
   * Applies translations to source data via TextChunk references.
   *
   * @param textChunks - TextChunks with references to data
   * @param translations - Map of index -> translated text
   * @returns Mutation result with count of translated chunks
   */
  apply(textChunks: TextChunk[], translations: Record<number, string>): void {
    for (const chunk of textChunks) {
      const translation = translations[chunk.index]
      if (translation === undefined) continue

      if (isPlainTextChunk(chunk)) {
        chunk.dataRef[chunk.key] = translation
      } else if (isRichTextChunk(chunk)) {
        chunk.nodeRef.text = translation
      }
    }
  }
}
