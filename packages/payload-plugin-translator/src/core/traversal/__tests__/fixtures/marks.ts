/** How a leaf is cut into units. */
export type UnitCut = "per-text-node" | "whole-container";

type Piece = { text?: string };

export const serializeMarks = (pieces: readonly Piece[]): string =>
  pieces.map((piece, index) => `<${index + 1}>${piece.text ?? ""}</${index + 1}>`).join("");

const MARK = /<(\d+)>([\s\S]*?)<\/\1>/gu;

/**
 * Text outside a mark has nowhere to go, and half a container written back is the failure nobody
 * notices — so a reply that is not entirely marks is refused whole.
 */
export const parseMarks = (reply: string): Map<number, string> | null => {
  const found = new Map<number, string>();
  let consumed = 0;

  for (const match of reply.matchAll(MARK)) {
    const id = Number(match[1]);
    if (found.has(id)) return null;
    found.set(id, match[2] ?? "");
    consumed += match[0].length;
  }

  const hasStrayText = consumed !== reply.length;
  if (hasStrayText || found.size === 0) return null;
  return found;
};

/** Writes a parsed reply onto the pieces it came from, or nothing at all. */
export const writeMarks = (pieces: readonly Piece[], translated: string): void => {
  const parsed = parseMarks(translated);
  if (parsed === null || parsed.size !== pieces.length) return;
  pieces.forEach((piece, index) => {
    const text = parsed.get(index + 1);
    if (text !== undefined) piece.text = text;
  });
};
