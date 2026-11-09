import { TranslatorBug } from "../../../errors/index.js";
import { parseInlineMarks } from "../../../kernel/lexical/inlineMarks.js";
import type { PipelineContext, PipelineStage } from "../../types/index.js";
import { isRichContainerChunk } from "../../types/index.js";
import type {
  TranslationProvider,
  TranslationRequestOptions,
} from "../../../domain/translation-providers/index.js";

/** Writes onto chunks the expander created, rather than returning — see `RichContainerChunk.reply`. */
function parseContainerReplies(ctx: PipelineContext, translations: Record<number, string>): void {
  for (const chunk of (ctx.textChunks ?? []).filter(isRichContainerChunk)) {
    const reply = translations[chunk.index];
    if (reply === undefined) continue;

    const result = parseInlineMarks(reply, chunk.fragments);
    if (result.ok) chunk.reply = result.fragments;
  }
}

function requestOptions(ctx: PipelineContext): TranslationRequestOptions {
  const options: TranslationRequestOptions = { document: ctx.document };

  if ((ctx.textChunks ?? []).some(isRichContainerChunk)) options.inlineMarks = true;

  return options;
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

    const translations = await this.provider.translate(
      ctx.textMap,
      ctx.sourceLng,
      ctx.targetLng,
      requestOptions(ctx)
    );

    if (!translations) {
      throw new TranslatorBug("Translation provider returned null");
    }

    parseContainerReplies(ctx, translations);

    return { ...ctx, translations };
  }
}
