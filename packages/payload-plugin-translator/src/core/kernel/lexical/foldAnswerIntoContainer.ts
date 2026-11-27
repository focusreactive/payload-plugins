import type { AnsweredSegment } from "./checkSegments.js";
import type { InlineFragment } from "./collectInlineFragments.js";
import type { SerializedLexicalNode, SerializedTextNode } from "./types.js";

export type FoldedText = { node: SerializedTextNode; text: string };

/**
 * The order of `replacementChildren` is what carries a mark's formatting to the word it now
 * belongs to.
 */
export type ContainerFold = {
  texts: readonly FoldedText[];
  replacementChildren: readonly SerializedLexicalNode[];
};

const mergedIntoNeighbour = (mark: AnsweredSegment): boolean => !mark.text;

/**
 * A node that never had a fragment — whitespace glued into a neighbour's text — is left out too,
 * which is what stops its space being rendered twice.
 * A mark naming no fragment is ignored: `checkSegments` judges the reply, this only arranges it.
 */
export function foldAnswerIntoContainer(
  fragments: readonly InlineFragment[],
  answered: readonly AnsweredSegment[]
): ContainerFold {
  const byId = new Map(fragments.map((fragment) => [fragment.id, fragment]));
  const texts: FoldedText[] = [];
  const replacementChildren: SerializedLexicalNode[] = [];

  for (const mark of answered) {
    const fragment = byId.get(mark.id);
    if (!fragment) continue;
    if (fragment.node) {
      if (mergedIntoNeighbour(mark)) continue;
      texts.push({ node: fragment.node, text: mark.text });
    }
    replacementChildren.push(fragment.top);
  }

  return { texts, replacementChildren };
}
