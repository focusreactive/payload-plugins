import type { FieldChunk, PlainTextChunk } from "../../types";
import type { ExpansionResult, TextExpander } from "./TextExpander.interface";

/**
 * Expands plain text and textarea fields into PlainTextChunks.
 */
export class PlainTextExpander implements TextExpander {
  canExpand(_chunk: FieldChunk, value: unknown): boolean {
    return typeof value === "string" && value.trim().length > 0;
  }

  expand(
    chunk: FieldChunk,
    value: unknown,
    startIndex: number
  ): ExpansionResult {
    const text = value as string;

    const textChunk: PlainTextChunk = {
      dataRef: chunk.dataRef,
      index: startIndex,
      key: chunk.key,
      text,
      type: "plain",
    };

    return {
      chunks: [textChunk],
      nextIndex: startIndex + 1,
      textMap: { [startIndex]: text },
    };
  }
}
