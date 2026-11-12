import { TranslatorBug } from "../../../errors/index.js";
import { collectTranslationTargets } from "../../../traversal/index.js";
import type { TranslationTarget } from "../../../traversal/index.js";
import { walkAddress } from "../../../domain/content-projection/walkAddress.js";
import type { IdPath } from "../../../domain/content-projection/idPath.js";
import type { TranslatableValue } from "../../../domain/translation-providers/index.js";
import type { PipelineContext, PipelineStage } from "../../types/index.js";

/**
 * The pieces are copied because what crosses the port is what the answer is checked against, and a
 * provider that edits the value it was handed would otherwise edit the record of what was sent.
 */
const asTranslatable = (target: TranslationTarget): TranslatableValue =>
  target.kind === "text"
    ? { kind: "text", text: target.text }
    : { kind: "segments", segments: target.pieces.map((piece) => ({ ...piece })) };

/**
 * Walks the reconciled document and keeps what the run asked for.
 */
export class WalkCollectorStage implements PipelineStage {
  execute(ctx: PipelineContext): PipelineContext {
    if (!ctx.reconciledData) {
      throw new TranslatorBug("WalkCollectorStage requires reconciledData from previous stage");
    }

    const walked = collectTranslationTargets({
      languages: ctx.languages,
      entry: {
        languageId: ctx.hostLanguageId,
        context: { fields: ctx.schema, data: ctx.reconciledData, source: ctx.sourceData },
      },
    });

    const wanted = new Set(ctx.selection);
    const targets: TranslationTarget[] = [];
    const sentAddresses: IdPath[] = [];
    for (const target of walked.targets) {
      const address = walkAddress(target.foldPath);
      if (!wanted.has(address)) continue;
      targets.push(target);
      sentAddresses.push(address);
    }

    const textMap: Record<number, TranslatableValue> = {};
    for (const [index, target] of targets.entries()) textMap[index] = asTranslatable(target);

    return {
      ...ctx,
      collected: { placements: walked.placements, targets },
      sentAddresses,
      textMap,
    };
  }
}
