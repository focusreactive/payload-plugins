import { TranslatorBug } from "../../../errors/index.js";
import type { AnsweredSegment } from "../../../kernel/lexical/checkSegments.js";
import { hasChildren } from "../../../kernel/lexical/index.js";
import type { SerializedLexicalNode } from "../../../kernel/lexical/index.js";
import type { RichContainerChunk, SettledAnswer, TextChunk } from "../../types/index.js";
import { isPlainTextChunk, isRichContainerChunk, isRichTextChunk } from "../../types/index.js";

/**
 * Writes a container's reply back by rebuilding `children` in the reply's order — which is what
 * carries a mark's formatting to the word it now belongs to.
 *
 * A mark that came back empty means its fragment merged into a neighbour, so its node leaves the
 * tree instead of staying behind as an empty one. A node that never had a fragment — the whitespace
 * glued into a neighbour's text — is likewise absent from the rebuilt array, which is what stops
 * its space being rendered twice.
 */
function tryApplyContainer(chunk: RichContainerChunk, parsed: AnsweredSegment[]): boolean {
  if (!hasChildren(chunk.containerRef)) return false;

  const byId = new Map(chunk.fragments.map((fragment) => [fragment.id, fragment]));
  const children: SerializedLexicalNode[] = [];
  for (const mark of parsed) {
    const fragment = byId.get(mark.id);
    if (!fragment) continue;
    if (fragment.node) {
      if (!mark.text) continue;
      fragment.node.text = mark.text;
    }
    children.push(fragment.top);
  }

  chunk.containerRef.children = children;
  return true;
}

/**
 * @returns the indexes it could not write. A chunk whose answer already failed is not among
 * them: that failure is its own report, and repeating it here would name one leaf twice.
 */
export function writeAnswers(
  textChunks: TextChunk[],
  answers: Record<number, SettledAnswer>
): Set<number> {
  const notWritten = new Set<number>();

  for (const chunk of textChunks) {
    const answer = answers[chunk.index];
    if (answer?.kind === "failed") continue;
    if (answer === undefined) {
      notWritten.add(chunk.index);
      continue;
    }

    if (isRichContainerChunk(chunk)) {
      const written = answer.kind === "segments" && tryApplyContainer(chunk, answer.segments);
      if (!written) notWritten.add(chunk.index);
      continue;
    }
    if (answer.kind !== "text") {
      notWritten.add(chunk.index);
      continue;
    }

    if (isPlainTextChunk(chunk)) {
      chunk.dataRef[chunk.key] = answer.text;
    } else if (isRichTextChunk(chunk)) {
      chunk.nodeRef.text = answer.text;
    } else {
      const exhaustive: never = chunk;
      throw new TranslatorBug(`unhandled text chunk: ${String(exhaustive)}`);
    }
  }

  return notWritten;
}
