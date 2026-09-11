import { parseInlineMarks } from "../../../kernel/lexical/inlineMarks";
import type { PipelineContext, PipelineStage } from "../../types";
import { isRichContainerChunk } from "../../types";
import type { TranslationProvider } from "../../../domain/translation-providers";

/** Writes onto chunks the expander created, rather than returning — see `RichContainerChunk.reply`. */
function parseContainerReplies(ctx: PipelineContext, translations: Record<number, string>): void {
  for (const chunk of (ctx.textChunks ?? []).filter(isRichContainerChunk)) {
    const reply = translations[chunk.index];
    if (reply === undefined) continue;

    const result = parseInlineMarks(reply, chunk.fragments);
    if (result.ok) chunk.reply = result.fragments;
  }
}

/**
 * Calls translation provider to translate text.
 */
export class TranslationStage implements PipelineStage {
  constructor(private readonly provider: TranslationProvider) {}

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    if (!ctx.textMap || Object.keys(ctx.textMap).length === 0) {
      return ctx;
    }

    const inlineMarks = (ctx.textChunks ?? []).some(isRichContainerChunk);

    // Called with three arguments when no marks were sent, so a provider (or a test) that
    // inspects the call sees exactly what it saw before this feature existed.
    const translations = inlineMarks
      ? await this.provider.translate(ctx.textMap, ctx.sourceLng, ctx.targetLng, {
          inlineMarks: true,
        })
      : await this.provider.translate(ctx.textMap, ctx.sourceLng, ctx.targetLng);

    if (!translations) {
      throw new Error("Translation provider returned null");
    }

    parseContainerReplies(ctx, translations);

    return { ...ctx, translations };
  }
}
