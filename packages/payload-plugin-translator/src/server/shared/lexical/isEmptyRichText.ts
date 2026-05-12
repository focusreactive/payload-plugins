import type { SerializedLexicalRoot } from './types'
import { traverseLexicalTree } from './traverseLexicalTree'
import { isSerializedLexicalTextNode } from './guards'

/**
 * Checks if a serialized Lexical richText structure is empty.
 *
 * Empty means:
 * - Only contains root/paragraph nodes with no content
 * - Text nodes are empty or whitespace-only
 *
 * Non-empty means:
 * - Contains any node other than root/paragraph/text (e.g., upload, block, heading)
 * - Contains text node with actual content
 */
export function isEmptyRichText(value: SerializedLexicalRoot): boolean {
  let hasContent = false
  traverseLexicalTree(value.root, (node) => {
    const { type } = node

    if (type !== 'paragraph' && type !== 'text' && type !== 'root') {
      hasContent = true
      return false
    }

    if (isSerializedLexicalTextNode(node)) {
      if (node.text.trim()) {
        hasContent = true
        return false
      }
    }
  })
  return !hasContent
}
