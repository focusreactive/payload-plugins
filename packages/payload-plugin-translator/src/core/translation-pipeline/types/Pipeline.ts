import type { FieldLike } from "../../kernel/field-traversal";

/**
 * Pipeline configuration for translation execution.
 * Contains only data transformation inputs — no persistence concerns.
 */
export type PipelineConfig = {
  schema: FieldLike[];
  sourceData: Record<string, unknown>;
  targetData: Record<string, unknown>;
  sourceLng: string;
  targetLng: string;
};

/**
 * Result of pipeline execution.
 * Contains translated data ready to be saved.
 */
export type PipelineResult = {
  /** Mutated data with translations applied */
  translatedData: Record<string, unknown>;
};
