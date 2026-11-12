import type { IdPath, LeafAddress } from "../../domain/content-projection/idPath.js";
import type { DocumentRef, TranslatableValue } from "../../domain/translation-providers/index.js";
import type { FieldLike } from "../../kernel/field-traversal/index.js";
import type { CollectedContent, RegisteredLanguage } from "../../traversal/index.js";
import type { SettledAnswer } from "./Pipeline.js";

export type PipelineContext = {
  readonly schema: FieldLike[];
  readonly sourceData: Record<string, unknown>;
  readonly targetData: Record<string, unknown>;
  readonly sourceLng: string;
  readonly targetLng: string;
  readonly document: DocumentRef;
  readonly selection: readonly LeafAddress[];
  readonly languages: readonly RegisteredLanguage[];
  readonly hostLanguageId: string;

  reconciledData?: Record<string, unknown>;
  collected?: CollectedContent;
  /**
   * The address each of those targets folds onto, in the same order — the key a receipt is written
   * under even when the text was found inside a block embedded in a rich text. Several targets may
   * share one address.
   */
  sentAddresses?: readonly IdPath[];
  textMap?: Record<number, TranslatableValue>;
  answers?: Record<number, SettledAnswer>;
};

export interface PipelineStage {
  execute(ctx: PipelineContext): PipelineContext | Promise<PipelineContext>;
}
