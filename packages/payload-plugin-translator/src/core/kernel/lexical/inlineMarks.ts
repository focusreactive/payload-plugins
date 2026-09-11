/**
 * Numbered inline marks: the wire format that lets a whole container be translated as one string
 * while still saying which piece carried which formatting.
 *
 * Format-agnostic on purpose — importing `./types` here would couple the wire format to the tree
 * walk, and the two change for different reasons.
 */

/** `text: null` — a line break or inline block. It is still numbered: it occupies a position the reply may move it to. */
export type MarkableFragment = {
  markId: number;
  text: string | null;
};

/** A fragment sent with `text: null` comes back with `text: ""`. */
export type ParsedMark = {
  markId: number;
  text: string;
};

/**
 * Why a reply could not be used. Corruption is an ordinary outcome here, not an anomaly —
 * the caller retranslates the container per-node — so it is a returned value, never a throw.
 */
export type MarkFailure =
  | "missing-mark"
  | "unknown-mark"
  | "repeated-mark"
  | "nested-marks"
  | "mismatched-close"
  | "unclosed-mark"
  | "no-text";

/** No partial success: half a container written into a document is the failure nobody notices. */
export type ParseResult =
  | { ok: true; fragments: ParsedMark[] }
  | { ok: false; reason: MarkFailure };

/** `<1>`, `</1>`, `<1/>` — with whitespace and leading zeros tolerated, because models add both. */
const MARK_TOKEN = /<\s*(\/?)\s*(\d+)\s*(\/?)\s*>/gu;

type Token = { kind: "open" | "close" | "self"; markId: number } | { kind: "text"; text: string };

const tokenize = (reply: string): Token[] => {
  const tokens: Token[] = [];
  let cursor = 0;

  MARK_TOKEN.lastIndex = 0;
  let match = MARK_TOKEN.exec(reply);
  while (match !== null) {
    if (match.index > cursor) {
      tokens.push({ kind: "text", text: reply.slice(cursor, match.index) });
    }

    const [, leadingSlash, digits, trailingSlash] = match;
    const markId = Number(digits);
    if (leadingSlash) tokens.push({ kind: "close", markId });
    else if (trailingSlash) tokens.push({ kind: "self", markId });
    else tokens.push({ kind: "open", markId });

    cursor = match.index + match[0].length;
    match = MARK_TOKEN.exec(reply);
  }

  if (cursor < reply.length) tokens.push({ kind: "text", text: reply.slice(cursor) });
  return tokens;
};

/** Re-inserts the source's own edge characters, not a plain space: a tab or NBSP was put there on purpose. */
const restoreEdges = (translated: string, source: string): string => {
  const leading = source.match(/^\s+/u)?.[0] ?? "";
  const trailing = source.match(/\s+$/u)?.[0] ?? "";
  const needsLeading = leading && translated === translated.trimStart();
  const needsTrailing = trailing && translated === translated.trimEnd();

  return `${needsLeading ? leading : ""}${translated}${needsTrailing ? trailing : ""}`;
};

/**
 * Renders fragments as one marked string, in the order given.
 *
 * Every fragment is wrapped, including unformatted ones, so the caller never has to build a node
 * from scratch on the way back. Numbers are written as given — they identify fragments and need
 * not be contiguous. Text is written verbatim: a fragment whose own text looks like a mark is
 * refused one level up, by the collector.
 */
export function serializeInlineMarks(fragments: MarkableFragment[]): string {
  return fragments
    .map((fragment) =>
      fragment.text === null
        ? `<${fragment.markId}/>`
        : `<${fragment.markId}>${fragment.text}</${fragment.markId}>`
    )
    .join("");
}

/**
 * Reads a reply back into fragments, **in the reply's order** — the target language decides where
 * each piece belongs. A mark returned empty is legitimate and yields `text: ""`.
 *
 * Text outside any mark is appended to the preceding mark (to the first when there is none)
 * rather than dropped: a model that lost a boundary mid-sentence still returned the words.
 *
 * Edge whitespace is restored only when the reply has the same shape as the request — same order,
 * no mark emptied. Once pieces move or merge their edges change legitimately, and restoring one
 * then produces a double space or a space trailing a paragraph.
 *
 * When a reply is corrupt several ways at once the reason reported is the first of: structural
 * (`nested-marks`, `mismatched-close`, `unclosed-mark`), then the mark set (`unknown-mark`,
 * `repeated-mark`, `missing-mark`), then `no-text` — a string that cannot be parsed unambiguously
 * has no reliable mark set to compare.
 *
 * @param fragments - the fragments that were sent: which numbers were issued, and their source text
 */
export function parseInlineMarks(reply: string, fragments: MarkableFragment[]): ParseResult {
  const collected: ParsedMark[] = [];
  let openMarkId: number | null = null;
  let openText = "";
  let strayBeforeFirst = "";

  const appendStray = (text: string) => {
    const last = collected.at(-1);
    if (last) last.text += text;
    else strayBeforeFirst += text;
  };

  for (const token of tokenize(reply)) {
    if (token.kind === "text") {
      if (openMarkId === null) appendStray(token.text);
      else openText += token.text;
      continue;
    }

    if (token.kind === "self") {
      if (openMarkId !== null) return { ok: false, reason: "nested-marks" };
      collected.push({ markId: token.markId, text: "" });
      continue;
    }

    if (token.kind === "open") {
      if (openMarkId !== null) return { ok: false, reason: "nested-marks" };
      openMarkId = token.markId;
      openText = "";
      continue;
    }

    if (openMarkId === null || openMarkId !== token.markId) {
      return { ok: false, reason: "mismatched-close" };
    }
    collected.push({ markId: openMarkId, text: openText });
    openMarkId = null;
    openText = "";
  }

  if (openMarkId !== null) return { ok: false, reason: "unclosed-mark" };
  if (strayBeforeFirst && collected.length > 0) {
    const first = collected[0];
    if (first) first.text = strayBeforeFirst + first.text;
  }

  const issued = new Map(fragments.map((fragment) => [fragment.markId, fragment]));
  const seen = new Set<number>();
  for (const mark of collected) {
    if (!issued.has(mark.markId)) return { ok: false, reason: "unknown-mark" };
    if (seen.has(mark.markId)) return { ok: false, reason: "repeated-mark" };
    seen.add(mark.markId);
  }
  if (seen.size !== issued.size) return { ok: false, reason: "missing-mark" };
  if (!collected.some((mark) => mark.text.trim())) return { ok: false, reason: "no-text" };

  const sameShape =
    collected.length === fragments.length &&
    collected.every((mark, index) => mark.markId === fragments[index]?.markId && mark.text !== "");

  return {
    ok: true,
    fragments: sameShape
      ? collected.map((mark) => {
          const source = issued.get(mark.markId)?.text;
          return source ? { ...mark, text: restoreEdges(mark.text, source) } : mark;
        })
      : collected,
  };
}
