/**
 * Numbered inline marks: the wire format that lets a whole container be translated as one
 * string while still saying which piece of it carried which formatting.
 *
 * Knows nothing about Lexical — or about any document format. It reads and writes strings and
 * numbered fragments, and that is deliberate: the mark format changes for different reasons
 * than a tree walk does.
 *
 * Design: `docs/plans/2026-09-08-richtext-container-granularity-design.md` §4 (D2, D4, D13, D16).
 */

/**
 * A fragment as the mark format sees it: a number, and the text it holds.
 *
 * `text: null` means the fragment carries no text at all — a line break, an inline block. It
 * still needs a number, because it still occupies a position the reply may move it to.
 */
export type MarkableFragment = {
  markId: number;
  text: string | null;
};

/** One fragment read back out of a reply. Text-free fragments come back with `text: ""`. */
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
  /** Closed with a different number than it opened with — not interleaving. */
  | "crossed-marks"
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

/** Restores an edge the model trimmed, using the source's own characters (a tab is not a space). */
const restoreEdges = (translated: string, source: string): string => {
  if (!translated) return translated;

  const leading = source.match(/^\s+/u)?.[0] ?? "";
  const trailing = source.match(/\s+$/u)?.[0] ?? "";
  const needsLeading = leading && translated === translated.trimStart();
  const needsTrailing = trailing && translated === translated.trimEnd();

  return `${needsLeading ? leading : ""}${translated}${needsTrailing ? trailing : ""}`;
};

/**
 * Renders fragments as one marked string, in the order given.
 *
 * Every fragment is wrapped, including ones carrying no formatting: the caller then never has
 * to build a node from scratch on the way back. A text-free fragment renders self-closing.
 *
 * Mark numbers are written as given — they identify fragments and need not be contiguous. Text
 * is written verbatim: a fragment whose own text looks like a mark is refused one level up, by
 * the collector. An empty fragment list renders an empty string.
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
 * Reads a reply back into fragments.
 *
 * On success fragments come back **in the reply's order** — that is the point of the format, as
 * the target language decides where each piece belongs. A mark returned empty is legitimate and
 * yields `text: ""`; its caller drops that node.
 *
 * Accepted liberties: any order; whitespace inside a mark, newlines included (`< 1 >`); a
 * leading zero; text sitting outside any mark, which is appended to the preceding mark (to the
 * first when there is none) rather than discarded — a model that lost a boundary mid-sentence
 * still returned the words. A fragment sent text-free that comes back carrying text has that
 * text ignored: there is no leaf to write it into.
 *
 * Edge whitespace is restored **only when the reply has the same shape as the request** — same
 * order, no mark returned empty. Once pieces move or merge their edges change legitimately, and
 * restoring one then produces a double space or a space trailing a paragraph. When it does
 * apply, the source's own characters come back, not a plain space: a tab or a non-breaking
 * space was put there on purpose.
 *
 * `no-text` is judged on non-blank content. When a reply is corrupt several ways at once, the
 * reason reported is the first of: structural (`nested-marks`, `crossed-marks`,
 * `unclosed-mark`), then the mark set (`unknown-mark`, `repeated-mark`, `missing-mark`), then
 * `no-text` — structure first, because a string that cannot be parsed unambiguously has no
 * reliable mark set to compare.
 *
 * @param reply - the string a translator returned
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
      return { ok: false, reason: "crossed-marks" };
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
