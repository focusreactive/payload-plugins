import type { FieldChunk, RichTextChunk } from '../../types'
import type { SerializedLexicalRoot } from '../../../../shared/lexical'
import { isSerializedLexicalRoot, collectSerializedLexicalTextNodes } from '../../../../shared/lexical'
import type { ExpansionResult, TextExpander } from './TextExpander.interface'

/**
 * Expands richText fields into multiple RichTextChunks (one per text node).
 */
export class RichTextExpander implements TextExpander {
  canExpand(chunk: FieldChunk, value: unknown): boolean {
    return chunk.schema.type === 'richText' && isSerializedLexicalRoot(value)
  }

  expand(_chunk: FieldChunk, value: unknown, startIndex: number): ExpansionResult {
    const root = value as SerializedLexicalRoot
    const textNodeRefs = collectSerializedLexicalTextNodes(root.root)

    const chunks: RichTextChunk[] = []
    const textMap: Record<number, string> = {}
    let index = startIndex

    for (const ref of textNodeRefs) {
      chunks.push({
        type: 'richText',
        index,
        text: ref.node.text,
        nodeRef: ref.node,
      })
      textMap[index] = ref.node.text
      index++
    }

    return {
      chunks,
      textMap,
      nextIndex: index,
    }
  }
}
