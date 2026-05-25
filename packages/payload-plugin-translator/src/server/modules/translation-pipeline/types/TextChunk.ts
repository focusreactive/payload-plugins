import type { SerializedTextNode } from '../../../shared/lexical'

/**
 * Text chunk for plain text/textarea fields.
 * Mutates dataRef[key] directly.
 */
export type PlainTextChunk = {
  type: 'plain'
  /** Unique index for translation mapping */
  index: number
  /** Original text value */
  text: string
  /** Reference to parent data object */
  dataRef: Record<string, unknown>
  /** Key in dataRef to mutate */
  key: string
}

/**
 * Text chunk for richText Lexical text nodes.
 * Mutates nodeRef.text directly.
 */
export type RichTextChunk = {
  type: 'richText'
  /** Unique index for translation mapping */
  index: number
  /** Original text value */
  text: string
  /** Direct reference to SerializedTextNode for mutation */
  nodeRef: SerializedTextNode
}

/**
 * Union type for all text chunks.
 * Schema-independent - contains only data references for mutation.
 */
export type TextChunk = PlainTextChunk | RichTextChunk

/**
 * Type guard for PlainTextChunk.
 */
export function isPlainTextChunk(chunk: TextChunk): chunk is PlainTextChunk {
  return chunk.type === 'plain'
}

/**
 * Type guard for RichTextChunk.
 */
export function isRichTextChunk(chunk: TextChunk): chunk is RichTextChunk {
  return chunk.type === 'richText'
}
