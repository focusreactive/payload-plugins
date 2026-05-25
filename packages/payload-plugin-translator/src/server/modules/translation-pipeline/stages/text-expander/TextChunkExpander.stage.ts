import type { PipelineContext, PipelineStage } from "../../types";
import { PlainTextExpander } from "./PlainTextExpander";
import { RichTextExpander } from "./RichTextExpander";
import { TextChunkExpander } from "./TextChunkExpander";
import type { TextExpander } from "./TextExpander.interface";

const defaultExpanders: TextExpander[] = [
  new RichTextExpander(),
  new PlainTextExpander(),
];

/**
 * Expands FieldChunks to TextChunks (schema-free).
 */
export class TextChunkExpanderStage implements PipelineStage {
  constructor(private readonly expanders: TextExpander[] = defaultExpanders) {}

  execute(ctx: PipelineContext): PipelineContext {
    if (!ctx.fieldChunks) {
      throw new Error(
        "TextChunkExpanderStage requires fieldChunks from previous stage"
      );
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
