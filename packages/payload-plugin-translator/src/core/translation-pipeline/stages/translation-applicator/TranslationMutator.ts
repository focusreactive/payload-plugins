import type { ParsedMark } from "../../../kernel/lexical/inlineMarks";
import { hasChildren } from "../../../kernel/lexical";
import type { SerializedLexicalNode } from "../../../kernel/lexical";
import type { RichContainerChunk, TextChunk } from "../../types";
import { isPlainTextChunk, isRichContainerChunk, isRichTextChunk } from "../../types";

/**
 * Writes a container's reply back by rebuilding `children` in the reply's order — which is what
 * carries a mark's formatting to the word it now belongs to.
 *
 * A mark that came back empty means its fragment merged into a neighbour, so its node leaves the
 * tree instead of staying behind as an empty one. A node that never had a fragment — the whitespace
 * glued into a neighbour's text — is likewise absent from the rebuilt array, which is what stops
 * its space being rendered twice.
 */
function applyContainer(chunk: RichContainerChunk, parsed: ParsedMark[]): void {
  if (!hasChildren(chunk.containerRef)) return;

  const byMarkId = new Map(chunk.fragments.map((fragment) => [fragment.markId, fragment]));
  const children: SerializedLexicalNode[] = [];
  for (const mark of parsed) {
    const fragment = byMarkId.get(mark.markId);
    if (!fragment) continue;
    if (fragment.node) {
      if (!mark.text) continue;
      fragment.node.text = mark.text;
    }
    children.push(fragment.top);
  }

  chunk.containerRef.children = children;
}

/**
 * Applies translations by mutating data through TextChunk references.
 * This is the simplest stage - just direct mutation.
 *
 * Stage 5 of the translation pipeline.
 */
export class TranslationMutator {
  /**
   * Applies translations to source data via TextChunk references.
   *
   * @param textChunks - TextChunks with references to data
   * @param translations - Map of index -> translated text
   * @returns Mutation result with count of translated chunks
   */
  apply(
    textChunks: TextChunk[],
    translations: Record<number, string>,
    containerFragments?: Record<number, ParsedMark[]>
  ): void {
    for (const chunk of textChunks) {
      if (isRichContainerChunk(chunk)) {
        const parsed = containerFragments?.[chunk.index];
        if (parsed) applyContainer(chunk, parsed);
        continue;
      }

      const translation = translations[chunk.index];
      if (translation === undefined) continue;

      if (isPlainTextChunk(chunk)) {
        chunk.dataRef[chunk.key] = translation;
      } else if (isRichTextChunk(chunk)) {
        chunk.nodeRef.text = translation;
      }
    }
  }
}
