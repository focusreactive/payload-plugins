import { TranslatorBug } from "../../../errors/index.js";
import type { PipelineContext, PipelineStage } from "../../types/index.js";
import type { TextExpander } from "./TextExpander.interface.js";
import { TextChunkExpander } from "./TextChunkExpander.js";
import { RichContainerExpander } from "./RichContainerExpander.js";
import { PlainTextExpander } from "./PlainTextExpander.js";

const defaultExpanders: TextExpander[] = [new RichContainerExpander(), new PlainTextExpander()];

/**
 * Expands FieldChunks to TextChunks (schema-free).
 */
export class TextChunkExpanderStage implements PipelineStage {
  execute(ctx: PipelineContext): PipelineContext {
    if (!ctx.fieldChunks) {
      throw new TranslatorBug("TextChunkExpanderStage requires fieldChunks from previous stage");
    }

    const expander = new TextChunkExpander(defaultExpanders);
    const { textChunks, textMap } = expander.expand(ctx.fieldChunks);

    return {
      ...ctx,
      textChunks,
      textMap,
    };
  }
}
