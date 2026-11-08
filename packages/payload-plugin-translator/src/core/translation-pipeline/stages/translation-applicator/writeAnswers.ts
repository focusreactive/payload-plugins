import { TranslatorBug } from "../../../errors/index.js";
import type { AnsweredSegment } from "../../../kernel/lexical/checkSegments.js";
import { foldAnswerIntoContainer } from "../../../kernel/lexical/foldAnswerIntoContainer.js";
import { hasChildren } from "../../../kernel/lexical/index.js";
import type { RichContainerChunk, SettledAnswer, TextChunk } from "../../types/index.js";
import { isPlainTextChunk, isRichContainerChunk, isRichTextChunk } from "../../types/index.js";

function tryApplyContainer(chunk: RichContainerChunk, parsed: AnsweredSegment[]): boolean {
  if (!hasChildren(chunk.containerRef)) return false;

  const { texts, replacementChildren } = foldAnswerIntoContainer(chunk.fragments, parsed);
  for (const { node, text } of texts) node.text = text;
  chunk.containerRef.children = [...replacementChildren];
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
