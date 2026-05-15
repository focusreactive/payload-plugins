import type { FieldChunk, TextChunk } from "../../types";

/**
 * Result of text expansion for a single FieldChunk.
 */
export interface ExpansionResult {
  /** Generated TextChunks */
  chunks: TextChunk[];
  /** Map of index -> text for translation API */
  textMap: Record<number, string>;
  /** Next available index */
  nextIndex: number;
}

/**
 * Interface for text expanders.
 * Each expander handles a specific type of field (plain text, richText).
 */
export interface TextExpander {
  /**
   * Checks if this expander can handle the given field chunk.
   */
  canExpand(chunk: FieldChunk, value: unknown): boolean;

  /**
   * Expands a FieldChunk into one or more TextChunks.
   */
  expand(
    chunk: FieldChunk,
    value: unknown,
    startIndex: number
  ): ExpansionResult;
}
