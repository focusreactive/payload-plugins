import { collectInlineFragments } from "../../../kernel/lexical/collectInlineFragments";
import {
  collectSerializedLexicalTextNodes,
  isSerializedLexicalRoot,
} from "../../../kernel/lexical";
import { serializeInlineMarks } from "../../../kernel/lexical/inlineMarks";
import type { FieldChunk, RichTextChunk, TextChunk } from "../../types";
import { RichTextExpander } from "./RichTextExpander";
import type { ExpansionResult, TextExpander } from "./TextExpander.interface";

/**
 * Expands richText into one chunk per container, so a whole sentence reaches the model and its
 * pieces can come back reordered.
 *
 * Containers the marked format cannot serve — a mark-shaped sequence in the source, or a single
 * fragment with nothing to reorder — fall back to the per-node expander. The fallback is held
 * here rather than expressed as `canExpand: false` because deciding requires walking the tree,
 * and a second expander would walk it again.
 */
export class RichContainerExpander implements TextExpander {
  private readonly perNode: TextExpander;

  constructor(perNode: TextExpander = new RichTextExpander()) {
    this.perNode = perNode;
  }

  canExpand(chunk: FieldChunk, value: unknown): boolean {
    return chunk.schema.type === "richText" && isSerializedLexicalRoot(value);
  }

  expand(chunk: FieldChunk, value: unknown, startIndex: number): ExpansionResult {
    const containers = collectInlineFragments(
      (value as { root: Parameters<typeof collectInlineFragments>[0] }).root
    );

    if (containers.every((container) => container.skip)) {
      return this.perNode.expand(chunk, value, startIndex);
    }

    // Skipped containers keep the per-node behaviour exactly, so their chunks come from the
    // per-node expander rather than from the fragments — the two disagree on whitespace nodes,
    // and a fallback that translated something different from today would not be a fallback.
    const perNodeChunks = this.perNode
      .expand(chunk, value, 0)
      .chunks.filter((each): each is RichTextChunk => each.type === "richText");

    const chunks: TextChunk[] = [];
    const textMap: Record<number, string> = {};
    let index = startIndex;

    const emit = (text: string, chunkOf: (at: number) => TextChunk) => {
      chunks.push(chunkOf(index));
      textMap[index] = text;
      index += 1;
    };

    for (const container of containers) {
      if (container.skip) {
        const nodes = new Set(
          collectSerializedLexicalTextNodes(container.node).map((ref) => ref.node)
        );
        for (const perNodeChunk of perNodeChunks) {
          if (!nodes.has(perNodeChunk.nodeRef)) continue;
          emit(perNodeChunk.text, (at) => ({ ...perNodeChunk, index: at }));
        }
        continue;
      }

      const text = serializeInlineMarks(container.fragments);

      emit(text, (at) => ({
        type: "richContainer",
        index: at,
        text,
        containerRef: container.node,
        fragments: container.fragments,
      }));
    }

    return { chunks, textMap, nextIndex: index };
  }
}
