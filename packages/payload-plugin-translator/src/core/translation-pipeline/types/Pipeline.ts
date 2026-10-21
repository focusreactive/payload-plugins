import type { IdPath } from "../../domain/content-projection/idPath.js";
import type { FieldLike } from "../../kernel/field-traversal/index.js";
import type { ChangedLeaves } from "../../domain/provenance/staleness.js";
import type { DocumentRef } from "../../domain/translation-providers/index.js";

export type PipelineConfig = {
  schema: FieldLike[];
  sourceData: Record<string, unknown>;
  targetData: Record<string, unknown>;
  sourceLng: string;
  targetLng: string;
  document: DocumentRef;
  sourceChangedByLeaf?: ChangedLeaves;
};

export type LeafOutcome = {
  idPath: IdPath;
  answeredInFull: boolean;
};

export type PipelineResult = {
  translatedData: Record<string, unknown>;
  /** One entry per leaf that yielded a chunk; a leaf absent here was never sent. */
  leaves: readonly LeafOutcome[];
};
