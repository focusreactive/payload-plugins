import type { SerializedLexicalNode, SerializedLexicalRoot, SerializedTextNode } from './types'
import { isObject } from '../utils'

/**
 * Node with children property.
 */
export type SerializedLexicalNodeWithChildren = SerializedLexicalNode & {
  children: SerializedLexicalNode[]
}

/**
 * Type guard: Checks if value is a serialized Lexical root structure.
 */
export function isSerializedLexicalRoot(value: unknown): value is SerializedLexicalRoot {
  return isObject(value) && 'root' in value && isObject(value.root)
}

/**
 * Type guard: Checks if node is a serialized Lexical text node.
 */
export function isSerializedLexicalTextNode(node: SerializedLexicalNode): node is SerializedTextNode {
  return node.type === 'text' && 'text' in node && typeof node.text === 'string'
}

/**
 * Type guard: Checks if node has children array.
 */
export function hasChildren(node: SerializedLexicalNode): node is SerializedLexicalNodeWithChildren {
  return 'children' in node && Array.isArray(node.children)
}
