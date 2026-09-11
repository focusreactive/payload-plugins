import type { FieldLike } from "../../kernel/field-traversal";
import type { ParsedMark } from "../../kernel/lexical/inlineMarks";
import type { FieldChunk } from "./FieldChunk";
import type { TextChunk } from "./TextChunk";

/**
 * Pipeline context passed through all stages.
 * Each stage reads from context and writes its results back.
 */
export type PipelineContext = {
  readonly schema: FieldLike[];
  readonly sourceData: Record<string, unknown>;
  readonly targetData: Record<string, unknown>;
  readonly sourceLng: string;
  readonly targetLng: string;

  /** Full document shape with reconciled source/target values */
  filteredData?: Record<string, unknown>;
  fieldChunks?: FieldChunk[];
  textChunks?: TextChunk[];
  textMap?: Record<number, string>;
  translations?: Record<number, string>;
  /**
   * Parsed marked replies, keyed by chunk index. A container missing here had a corrupt reply and
   * must be left in its source language.
   */
  containerFragments?: Record<number, ParsedMark[]>;
};

/**
 * Interface for pipeline stages.
 * Each stage transforms the context and returns updated context.
 */
export interface PipelineStage {
  execute(ctx: PipelineContext): PipelineContext | Promise<PipelineContext>;
}
