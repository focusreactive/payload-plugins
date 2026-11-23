import { LINK_SNIPPET_RADIUS } from "../../constants";
import type { WordToken } from "../../keyphrases/text";
import type { LinkMatch } from "../../links/types";

export interface TokenSpan {
  first: WordToken;
  firstIndex: number;
  last: WordToken;
  lastIndex: number;
}

const ELLIPSIS_START = "… ";
const ELLIPSIS_END = " …";

function widen(
  tokens: WordToken[],
  edgeIndex: number,
  edge: WordToken,
  step: 1 | -1,
  within: (token: WordToken) => boolean
): WordToken {
  let widest = edge;
  let index = edgeIndex + step;
  let next = tokens[index];

  while (next && within(next)) {
    widest = next;
    index += step;
    next = tokens[index];
  }

  return widest;
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/gu, " ");
}

export function snippetOf(
  text: string,
  tokens: WordToken[],
  { first, firstIndex, last, lastIndex }: TokenSpan
): Pick<LinkMatch, "snippet" | "snippetMatch"> {
  const from = first.start - LINK_SNIPPET_RADIUS;
  const to = last.end + LINK_SNIPPET_RADIUS;
  const start = widen(tokens, firstIndex, first, -1, (token) => token.start >= from);
  const end = widen(tokens, lastIndex, last, 1, (token) => token.end <= to);
  const atStart = start === tokens[0];
  const atEnd = end === tokens.at(-1);
  const before = collapseSpaces(text.slice(atStart ? 0 : start.start, first.start)).trimStart();
  const matched = collapseSpaces(text.slice(first.start, last.end));
  const after = collapseSpaces(text.slice(last.end, atEnd ? text.length : end.end)).trimEnd();
  const lead = atStart ? "" : ELLIPSIS_START;
  const matchStart = lead.length + before.length;

  return {
    snippet: `${lead}${before}${matched}${after}${atEnd ? "" : ELLIPSIS_END}`,
    snippetMatch: { start: matchStart, end: matchStart + matched.length },
  };
}
