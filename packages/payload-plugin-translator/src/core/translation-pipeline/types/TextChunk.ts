import type { InlineFragment } from "../../kernel/lexical/collectInlineFragments";
import type { ParsedMark } from "../../kernel/lexical/inlineMarks";
import type { SerializedLexicalNode, SerializedTextNode } from "../../kernel/lexical";

/**
 * Text chunk for plain text/textarea fields.
 * Mutates dataRef[key] directly.
 */
export type PlainTextChunk = {
  type: "plain";
  /** Unique index for translation mapping */
  index: number;
  /** Original text value */
  text: string;
  /** Reference to parent data object */
  dataRef: Record<string, unknown>;
  /** Key in dataRef to mutate */
  key: string;
};

/**
 * Text chunk for richText Lexical text nodes.
 * Mutates nodeRef.text directly.
 */
export type RichTextChunk = {
  type: "richText";
  /** Unique index for translation mapping */
  index: number;
  /** Original text value */
  text: string;
  /** Direct reference to SerializedTextNode for mutation */
  nodeRef: SerializedTextNode;
};

/**
 * Text chunk for a whole rich-text container (paragraph, heading, list item).
 *
 * One chunk per container rather than per text node, so the model receives a connected sentence
 * and may reorder its pieces.
 */
export type RichContainerChunk = {
  type: "richContainer";
  index: number;
  /** The container whose `children` are rebuilt when the reply reorders marks */
  containerRef: SerializedLexicalNode;
  /** Fragments in document order, as collected */
  fragments: InlineFragment[];
  /**
   * The reply's marks, once the translation stage has parsed a usable one. Absent means this
   * container keeps its source text — the same outcome whether no reply came back or it could not
   * be parsed, and the applicator must not tell the two apart.
   */
  reply?: ParsedMark[];
};

/**
 * Union type for all text chunks.
 * Schema-independent - contains only data references for mutation.
 */
export type TextChunk = PlainTextChunk | RichTextChunk | RichContainerChunk;

export function isRichContainerChunk(chunk: TextChunk): chunk is RichContainerChunk {
  return chunk.type === "richContainer";
}

/**
 * Type guard for PlainTextChunk.
 */
export function isPlainTextChunk(chunk: TextChunk): chunk is PlainTextChunk {
  return chunk.type === "plain";
}

/**
 * Type guard for RichTextChunk.
 */
export function isRichTextChunk(chunk: TextChunk): chunk is RichTextChunk {
  return chunk.type === "richText";
}
