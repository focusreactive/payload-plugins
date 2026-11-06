import type { LeafAddress } from "../../domain/content-projection/idPath.js";
import type { IdPath } from "../../domain/content-projection/idPath.js";
import type { FieldLike } from "../../kernel/field-traversal/index.js";
import type { DocumentRef, ValueFailureCode } from "../../domain/translation-providers/index.js";
import type { AnsweredSegment } from "../../kernel/lexical/checkSegments.js";

export type PipelineConfig = {
  schema: FieldLike[];
  sourceData: Record<string, unknown>;
  targetData: Record<string, unknown>;
  sourceLng: string;
  targetLng: string;
  document: DocumentRef;
  selection: readonly LeafAddress[];
};

export type LeafFailureCode = ValueFailureCode | "not-answered" | "not-written";

export type LeafFailure = { code: LeafFailureCode; message?: string };

export type SettledAnswer =
  | { kind: "text"; text: string }
  | { kind: "segments"; segments: AnsweredSegment[] }
  | { kind: "failed"; failure: LeafFailure };

export type LeafOutcome =
  | { idPath: IdPath; answered: true }
  | { idPath: IdPath; answered: false; failures: readonly LeafFailure[] };

export type PipelineResult =
  | { sent: false }
  | {
      sent: true;
      translatedData: Record<string, unknown>;
      leaves: readonly LeafOutcome[];
    };
