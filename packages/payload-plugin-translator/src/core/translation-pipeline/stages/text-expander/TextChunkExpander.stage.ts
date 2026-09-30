import type { PipelineContext, PipelineStage } from "../../types/index.js";
import type { TextExpander } from "./TextExpander.interface.js";
import { TextChunkExpander } from "./TextChunkExpander.js";
import { RichTextExpander } from "./RichTextExpander.js";
import { PlainTextExpander } from "./PlainTextExpander.js";

const defaultExpanders: TextExpander[] = [new RichTextExpander(), new PlainTextExpander()];

/**
 * Expands FieldChunks to TextChunks (schema-free).
 */
export class TextChunkExpanderStage implements PipelineStage {
  constructor(private readonly expanders: TextExpander[] = defaultExpanders) {}

  execute(ctx: PipelineContext): PipelineContext {
    if (!ctx.fieldChunks) {
      throw new Error("TextChunkExpanderStage requires fieldChunks from previous stage");
    }

    const expander = new TextChunkExpander(this.expanders);
    const { textChunks, textMap } = expander.expand(ctx.fieldChunks);

    return {
      ...ctx,
      textChunks,
      textMap,
    };
  }
}
