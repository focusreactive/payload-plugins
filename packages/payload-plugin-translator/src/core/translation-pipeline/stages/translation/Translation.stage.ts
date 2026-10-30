import { parseInlineMarks } from "../../../kernel/lexical/inlineMarks.js";
import type { PipelineContext, PipelineStage, RejectedReply } from "../../types/index.js";
import { isRichContainerChunk } from "../../types/index.js";
import type {
  TranslationProvider,
  TranslationRequest,
} from "../../../domain/translation-providers/index.js";

function attachContainerReplies(
  ctx: PipelineContext,
  translations: Record<number, string>
): RejectedReply[] {
  const rejected: RejectedReply[] = [];
  for (const chunk of (ctx.textChunks ?? []).filter(isRichContainerChunk)) {
    const reply = translations[chunk.index];
    if (reply === undefined) continue;

    const result = parseInlineMarks(reply, chunk.fragments);
    if (result.ok) chunk.reply = result.fragments;
    else rejected.push({ idPath: chunk.idPath, reason: result.reason });
  }
  return rejected;
}

function translationRequest(ctx: PipelineContext): TranslationRequest {
  return {
    sourceLng: ctx.sourceLng,
    targetLng: ctx.targetLng,
    document: ctx.document,
    inlineMarks: (ctx.textChunks ?? []).some(isRichContainerChunk),
  };
}

/**
 * Calls translation provider to translate text.
 */
export class TranslationStage implements PipelineStage {
  private readonly provider: TranslationProvider;
  constructor(provider: TranslationProvider) {
    this.provider = provider;
  }

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    if (!ctx.textMap || Object.keys(ctx.textMap).length === 0) {
      return ctx;
    }

    const translations = await this.provider.translate(ctx.textMap, translationRequest(ctx));

    const rejected = attachContainerReplies(ctx, translations);

    return { ...ctx, translations, rejected };
  }
}
