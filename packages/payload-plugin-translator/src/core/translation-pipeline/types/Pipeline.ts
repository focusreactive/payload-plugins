import type { IdPath } from "../../domain/content-projection/idPath.js";
import type { FieldLike } from "../../kernel/field-traversal/index.js";
import type { ChangedLeaves } from "../../domain/provenance/staleness.js";

export type PipelineConfig = {
  schema: FieldLike[];
  sourceData: Record<string, unknown>;
  targetData: Record<string, unknown>;
  sourceLng: string;
  targetLng: string;
  sourceChangedByLeaf?: ChangedLeaves;
};

export type PipelineResult = {
  translatedData: Record<string, unknown>;
  /**
   * The leaves actually sent for translation, by the same address a provenance receipt is keyed on.
   * A caller writing a receipt may only claim these — see `ProvenanceService.record`.
   */
  translatedPaths: IdPath[];
};
