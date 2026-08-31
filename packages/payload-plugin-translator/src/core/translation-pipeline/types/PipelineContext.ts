import type { FieldLike } from "../../kernel/field-traversal";
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
  /**
   * What the caller considers ALREADY TRANSLATED, for the strategy's skip decision.
   *
   * Usually the same object as `targetData`, and the two are separate because they answer
   * different questions: `targetData` is the layer being written, and a value copied from it
   * lands verbatim in the result; this is merely consulted. A caller whose storage keeps
   * drafts apart from published content has to point them at different layers, or a
   * translation that exists only as a draft reads as missing and gets redone.
   */
  readonly existingTranslation: Record<string, unknown>;
  readonly sourceLng: string;
  readonly targetLng: string;

  /** Full document shape with reconciled source/target values */
  filteredData?: Record<string, unknown>;
  fieldChunks?: FieldChunk[];
  /**
   * How many leaves were filled from `existingTranslation` rather than translated. Nonzero
   * means the result differs from the write layer even when nothing needed translating, so
   * the run must not be short-circuited as empty.
   */
  carriedCount?: number;
  textChunks?: TextChunk[];
  textMap?: Record<number, string>;
  translations?: Record<number, string>;
};

/**
 * Interface for pipeline stages.
 * Each stage transforms the context and returns updated context.
 */
export interface PipelineStage {
  execute(ctx: PipelineContext): PipelineContext | Promise<PipelineContext>;
}
