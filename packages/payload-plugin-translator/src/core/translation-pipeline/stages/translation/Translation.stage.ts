import { parseInlineMarks } from "../../../kernel/lexical/inlineMarks";
import type { ParsedMark } from "../../../kernel/lexical/inlineMarks";
import type { PipelineContext, PipelineStage } from "../../types";
import { isRichContainerChunk } from "../../types";
import type { TranslationProvider } from "../../../domain/translation-providers";

/** A container missing from the result had a corrupt reply and keeps its source text. */
function parseContainerReplies(
  ctx: PipelineContext,
  translations: Record<number, string>
): Record<number, ParsedMark[]> | undefined {
  const containers = (ctx.textChunks ?? []).filter(isRichContainerChunk);
  if (containers.length === 0) return undefined;

  const parsed: Record<number, ParsedMark[]> = {};

  for (const chunk of containers) {
    const reply = translations[chunk.index];
    if (reply === undefined) continue;

    const result = parseInlineMarks(reply, chunk.fragments);
    if (result.ok) parsed[chunk.index] = result.fragments;
  }

  return parsed;
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

    return {
      ...ctx,
      translations,
      containerFragments: parseContainerReplies(ctx, translations),
    };
  }
}
