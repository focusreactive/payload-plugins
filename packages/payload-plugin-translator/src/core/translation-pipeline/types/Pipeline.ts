import type { LeafAddress } from "../../domain/content-projection/idPath.js";
import type { IdPath } from "../../domain/content-projection/idPath.js";
import type { MarkFailure } from "../../kernel/lexical/inlineMarks.js";
import type { FieldLike } from "../../kernel/field-traversal/index.js";
import type { DocumentRef } from "../../domain/translation-providers/index.js";

export type PipelineConfig = {
  schema: FieldLike[];
  sourceData: Record<string, unknown>;
  targetData: Record<string, unknown>;
  sourceLng: string;
  targetLng: string;
  document: DocumentRef;
  selection: readonly LeafAddress[];
};

export type LeafOutcome = {
  idPath: IdPath;
  answeredInFull: boolean;
};

/** A container whose reply could not be used, so it kept its source text. */
export type RejectedReply = {
  idPath: IdPath;
  reason: MarkFailure;
};

export type PipelineResult = {
  translatedData: Record<string, unknown>;
  /** One entry per leaf that yielded a chunk; a leaf absent here was never sent. */
  leaves: readonly LeafOutcome[];
  rejected: readonly RejectedReply[];
};
