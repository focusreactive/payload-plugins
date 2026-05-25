/**
 * Re-exports serialized Lexical types from 'lexical' package.
 * These types represent the JSON structure stored in the database.
 */
import type {
  SerializedLexicalNode,
  SerializedTextNode,
  SerializedRootNode,
} from '@payloadcms/richtext-lexical/lexical'

export type { SerializedLexicalNode, SerializedTextNode, SerializedRootNode }

/**
 * Serialized Lexical root structure as stored in Payload CMS richText fields.
 * Wraps the root node in a { root: ... } object.
 */
export type SerializedLexicalRoot = {
  root: SerializedLexicalNode
}

/**
 * Reference to a serialized text node for mutation during translation.
 */
export type SerializedTextNodeRef = {
  node: SerializedTextNode
}
