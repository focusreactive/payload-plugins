import type { SerializedLexicalNode, SerializedTextNodeRef } from './types'
import { hasChildren, isSerializedLexicalTextNode } from './guards'

/**
 * Recursively collects text node references from serialized Lexical JSON.
 */
function collectTextNodesRecursive(node: SerializedLexicalNode, refs: SerializedTextNodeRef[]): void {
  if (isSerializedLexicalTextNode(node)) {
    if (node.text.trim().length > 0) {
      refs.push({ node })
    }
    return
  }

  if (hasChildren(node)) {
    for (const child of node.children) {
      collectTextNodesRecursive(child, refs)
    }
  }
}

/**
 * Traverses serialized Lexical JSON and returns all non-empty text node references.
 * Only collects text nodes with content (after trimming whitespace).
 *
 * @param node - The serialized Lexical node to traverse
 * @returns Array of references to text nodes for mutation
 */
export function collectSerializedLexicalTextNodes(node: SerializedLexicalNode): SerializedTextNodeRef[] {
  const refs: SerializedTextNodeRef[] = []
  collectTextNodesRecursive(node, refs)
  return refs
}
