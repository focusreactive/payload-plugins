export type SentSegment = {
  id: number;
  text: string | null;
};

export type AnsweredSegment = {
  id: number;
  text: string;
};

export type SegmentFailure = "missing-segment" | "unknown-segment" | "repeated-segment" | "no-text";

export type CheckResult =
  | { ok: true; segments: AnsweredSegment[] }
  | { ok: false; reason: SegmentFailure };

export function carriesOwnText(sentText: string | null): boolean {
  return sentText !== null;
}

type MatchedSegment = {
  id: number;
  sentIndex: number;
  sentText: string | null;
  answeredText: string;
};

type MatchResult = { ok: true; segments: MatchedSegment[] } | { ok: false; reason: SegmentFailure };

/** The pairs come back in the answer's order, which is not always the request's. */
function matchAnswers(
  answered: readonly AnsweredSegment[],
  sent: readonly SentSegment[]
): MatchResult {
  const sentById = new Map(sent.map((segment, index) => [segment.id, { segment, index }]));
  const segments: MatchedSegment[] = [];
  const seen = new Set<number>();

  for (const { id, text } of answered) {
    const found = sentById.get(id);
    if (found === undefined) return { ok: false, reason: "unknown-segment" };
    if (seen.has(id)) return { ok: false, reason: "repeated-segment" };

    seen.add(id);
    segments.push({
      id,
      sentIndex: found.index,
      sentText: found.segment.text,
      answeredText: text,
    });
  }

  if (segments.length !== sent.length) return { ok: false, reason: "missing-segment" };
  return { ok: true, segments };
}

const carriesTranslation = (matched: readonly MatchedSegment[]): boolean =>
  matched.some((segment) => carriesOwnText(segment.sentText) && segment.answeredText.trim() !== "");

const keptRequestShape = (matched: readonly MatchedSegment[]): boolean =>
  matched.every(
    (segment, index) =>
      segment.sentIndex === index &&
      (!carriesOwnText(segment.sentText) || segment.answeredText !== "")
  );

const discardTextForPlaceholder = (id: number): AnsweredSegment => ({ id, text: "" });

const restoreEdges = (answeredText: string, sentText: string): string => {
  const leading = sentText.match(/^\s+/u)?.[0] ?? "";
  const trailing = sentText.match(/\s+$/u)?.[0] ?? "";
  const needsLeading = leading && answeredText === answeredText.trimStart();
  const needsTrailing = trailing && answeredText === answeredText.trimEnd();

  return `${needsLeading ? leading : ""}${answeredText}${needsTrailing ? trailing : ""}`;
};

/**
 * Validates an answer against the segments that were sent and returns the text to write per id.
 *
 * Source edge whitespace is restored only when the answer kept the request's order and pieces:
 * after a move or merge the edges change legitimately, and restoring them would double a space.
 */
export function checkSegments(
  answered: readonly AnsweredSegment[],
  sent: readonly SentSegment[]
): CheckResult {
  const match = matchAnswers(answered, sent);
  if (!match.ok) return match;

  const matched = match.segments;
  if (!carriesTranslation(matched)) return { ok: false, reason: "no-text" };

  const shapeKept = keptRequestShape(matched);
  return {
    ok: true,
    segments: matched.map(({ id, sentText, answeredText }) => {
      if (sentText === null) return discardTextForPlaceholder(id);
      return { id, text: shapeKept ? restoreEdges(answeredText, sentText) : answeredText };
    }),
  };
}
