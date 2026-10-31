import type { Segment, SegmentId } from "../../../core/domain/translation-providers/index.js";

/**
 * Appended to a system prompt when some values travel under `marked` and the rest under `plain`.
 *
 * The wording is measured — about 0.45% of paragraphs lose a mark on current models
 * (`docs/plans/2026-10-30-segments-on-the-port.task.md`, which also records the rejected
 * same-words rule). Reword it only with a new measurement.
 *
 * @since 1.0.0
 */
export function inlineMarksInstruction(): string {
  return `The values under "marked" contain numbered inline marks, written as <1>text</1> or <5/>. They carry formatting, not content.
Return every mark exactly once, keeping its number, and put each mark where the translated sentence needs it — the order of marks may change.
If a piece of text merges into a neighbouring mark, return the emptied mark as <2></2>; never omit a mark.
The values under "plain" contain no marks: anything in them that looks like one is part of the text, to be kept as it is.
Never introduce a mark into a value that has none, and never nest marks.`;
}

/** `<1>`, `</1>`, `<1/>` — with whitespace and leading zeros tolerated, because models add both. */
const MARK_TOKEN = /<\s*(\/?)\s*(\d+)\s*(\/?)\s*>/gu;

// No `g`: `.test()` on a global regex keeps `lastIndex` between calls.
const MARK_SHAPED = new RegExp(MARK_TOKEN.source, "u");

type Token = { kind: "open" | "close" | "self"; id: SegmentId } | { kind: "text"; text: string };

const tokenize = (reply: string): Token[] => {
  const tokens: Token[] = [];
  let cursor = 0;

  for (const match of reply.matchAll(MARK_TOKEN)) {
    if (match.index > cursor) {
      tokens.push({ kind: "text", text: reply.slice(cursor, match.index) });
    }

    const [whole, leadingSlash, digits, trailingSlash] = match;
    const id = Number(digits);
    if (leadingSlash) tokens.push({ kind: "close", id });
    else if (trailingSlash) tokens.push({ kind: "self", id });
    else tokens.push({ kind: "open", id });

    cursor = match.index + whole.length;
  }

  if (cursor < reply.length) tokens.push({ kind: "text", text: reply.slice(cursor) });
  return tokens;
};

/**
 * Whether these segments can travel as one marked string. Text that already looks like a mark
 * cannot: the reply could not tell it apart from the marks.
 *
 * @since 1.0.0
 */
export function canEncodeSegments(segments: readonly Segment[]): boolean {
  return !segments.some((segment) => segment.text !== null && MARK_SHAPED.test(segment.text));
}

/**
 * The marked wire format: the string a provider sends, and what {@link decodeSegments} reads back.
 *
 * @since 1.0.0
 */
export function encodeSegments(segments: readonly Segment[]): string {
  return segments
    .map((segment) =>
      segment.text === null ? `<${segment.id}/>` : `<${segment.id}>${segment.text}</${segment.id}>`
    )
    .join("");
}

/**
 * Returns segments in the reply's order; an empty mark yields `text: ""`. Text outside any mark joins
 * the preceding mark (or the first, if none precedes). Only structure is judged — nesting, an
 * unmatched close, an unclosed mark; whether every id came back once is the caller's check.
 *
 * @since 1.0.0
 */
export function decodeSegments(
  reply: string
): { ok: true; segments: { id: SegmentId; text: string }[] } | { ok: false; reason: "malformed" } {
  const segments: { id: SegmentId; text: string }[] = [];
  let openId: SegmentId | null = null;
  let openText = "";
  let strayBeforeFirst = "";

  const appendStray = (text: string) => {
    const last = segments.at(-1);
    if (last) last.text += text;
    else strayBeforeFirst += text;
  };

  for (const token of tokenize(reply)) {
    if (token.kind === "text") {
      if (openId === null) appendStray(token.text);
      else openText += token.text;
      continue;
    }
    if (token.kind === "self") {
      if (openId !== null) return { ok: false, reason: "malformed" };
      segments.push({ id: token.id, text: "" });
      continue;
    }
    if (token.kind === "open") {
      if (openId !== null) return { ok: false, reason: "malformed" };
      openId = token.id;
      openText = "";
      continue;
    }
    if (openId === null || openId !== token.id) return { ok: false, reason: "malformed" };
    segments.push({ id: openId, text: openText });
    openId = null;
    openText = "";
  }

  if (openId !== null) return { ok: false, reason: "malformed" };
  // A reply with no mark at all has nowhere to put its text: the caller's id check rejects it anyway.
  const first = segments[0];
  if (strayBeforeFirst && first) first.text = strayBeforeFirst + first.text;

  return { ok: true, segments };
}
