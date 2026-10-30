import type { LeafAddress } from "../../domain/content-projection/idPath.js";
import type { DocumentRef } from "../../domain/translation-providers/index.js";
import type { FieldLike } from "../../kernel/field-traversal/index.js";
import type { FieldChunk } from "./FieldChunk.js";
import type { RejectedReply } from "./Pipeline.js";
import type { TextChunk } from "./TextChunk.js";

export type PipelineContext = {
  readonly schema: FieldLike[];
  readonly sourceData: Record<string, unknown>;
  readonly targetData: Record<string, unknown>;
  readonly sourceLng: string;
  readonly targetLng: string;
  readonly document: DocumentRef;
  readonly selection: readonly LeafAddress[];

  reconciledData?: Record<string, unknown>;
  fieldChunks?: FieldChunk[];
  textChunks?: TextChunk[];
  textMap?: Record<number, string>;
  translations?: Record<number, string>;
  rejected?: RejectedReply[];
  writtenChunks?: TextChunk[];
};

export interface PipelineStage {
  execute(ctx: PipelineContext): PipelineContext | Promise<PipelineContext>;
}
