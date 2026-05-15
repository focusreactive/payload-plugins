import type { Field } from "payload";

/**
 * Pipeline configuration for translation execution.
 * Contains only data transformation inputs — no persistence concerns.
 */
export interface PipelineConfig {
  schema: Field[];
  sourceData: Record<string, unknown>;
  targetData: Record<string, unknown>;
  sourceLng: string;
  targetLng: string;
}

/**
 * Result of pipeline execution.
 * Contains translated data ready to be saved.
 */
export interface PipelineResult {
  /** Mutated data with translations applied */
  translatedData: Record<string, unknown>;
}
