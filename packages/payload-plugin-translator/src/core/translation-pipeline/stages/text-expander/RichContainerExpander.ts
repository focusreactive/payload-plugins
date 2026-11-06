import { collectInlineFragments } from "../../../kernel/lexical/collectInlineFragments.js";
import {
  collectSerializedLexicalTextNodes,
  isSerializedLexicalRoot,
} from "../../../kernel/lexical/index.js";
import type { TranslatableValue } from "../../../domain/translation-providers/index.js";
import type { FieldChunk, RichTextChunk, TextChunk } from "../../types/index.js";
import { RichTextExpander } from "./RichTextExpander.js";
import type { ExpansionResult, TextExpander } from "./TextExpander.interface.js";

/**
 * Expands richText into one chunk per container, so a whole sentence reaches the model and its
 * pieces can come back reordered.
 *
 * The fallback to the per-node expander is decided here rather than through `canExpand: false`:
 * deciding needs the tree walk, and a second expander would repeat it.
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
    const textMap: ExpansionResult["textMap"] = {};
    let index = startIndex;

    const emit = (translatable: TranslatableValue, chunkOf: (at: number) => TextChunk) => {
      chunks.push(chunkOf(index));
      textMap[index] = translatable;
      index += 1;
    };

    for (const container of containers) {
      if (container.skip) {
        const nodes = new Set(
          collectSerializedLexicalTextNodes(container.node).map((ref) => ref.node)
        );
        for (const perNodeChunk of perNodeChunks) {
          if (!nodes.has(perNodeChunk.nodeRef)) continue;
          emit({ kind: "text", text: perNodeChunk.text }, (at) => ({ ...perNodeChunk, index: at }));
        }
        continue;
      }

      const segments = container.fragments.map((fragment) => ({
        id: fragment.id,
        text: fragment.text,
      }));

      emit({ kind: "segments", segments }, (at) => ({
        type: "richContainer",
        index: at,
        idPath: chunk.idPath,
        containerRef: container.node,
        fragments: container.fragments,
      }));
    }

    return { chunks, textMap, nextIndex: index };
  }
}
