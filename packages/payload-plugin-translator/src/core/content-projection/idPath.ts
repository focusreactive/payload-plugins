/**
 * `IdPath` — the stable, location-based identity of a translatable leaf (slice 6 design,
 * `docs/plans/2026-06-30-slice6-contentprojector-idpath-design.md`).
 *
 * It is the field path from the document root, with one crucial change over a positional path:
 * **array/blocks element indices are replaced by the element's `id`** (`+ blockType` for blocks),
 * so the path survives reordering and means the same thing across time. Group/tab/leaf name
 * segments are unchanged; an element with no `id` falls back to a marked positional segment.
 *
 * `idPath` is *where* a piece lives (identity), never *what* it contains — so it can be compared
 * across time to detect content drift. The whole grammar (escaping, blockType folding, fallback)
 * lives in {@link makeIdPath}, the sole constructor, so it can never drift.
 */
export type IdPath = string & { readonly __brand: "IdPath" };

/**
 * One structural step of an {@link IdPath}. Callers push these while walking; only
 * {@link makeIdPath} renders them to a string, keeping the grammar in one place.
 */
export type PathSegment =
  | { kind: "key"; name: string } // a group/tab/leaf field name
  | { kind: "element"; id: string; blockType?: string } // an array/blocks element, keyed by id
  | { kind: "index"; index: number }; // fallback when an element has no id

const SEP = ".";

/**
 * Escape the segment separator, the blockType delimiter, and the positional-fallback marker so
 * names/ids can't split the path or collide with the "#index" no-id fallback rendered in
 * {@link renderSegment}.
 */
const enc = (value: string): string => value.replace(/[\\#.:]/gu, (c) => `\\${c}`);

const renderSegment = (segment: PathSegment): string => {
  switch (segment.kind) {
    case "key":
      return enc(segment.name);
    case "element":
      return segment.blockType === undefined
        ? enc(segment.id)
        : `${enc(segment.id)}:${enc(segment.blockType)}`;
    case "index":
      return `#${segment.index}`;
    default: {
      const exhaustive: never = segment;
      throw new Error(`unhandled path segment: ${String(exhaustive)}`);
    }
  }
};

/**
 * The sole constructor of an {@link IdPath}. Renders structural segments to the branded string.
 */
export function makeIdPath(segments: PathSegment[]): IdPath {
  return segments.map(renderSegment).join(SEP) as IdPath;
}

/**
 * Build the {@link PathSegment} for one array/blocks element from its data item: keyed by the
 * element's `id` (with `blockType` folded in for blocks), or a positional fallback when the element
 * carries no usable `id`.
 *
 * @param item - The element's data object.
 * @param isBlocks - Whether the parent field is a `blocks` field (then `blockType` is folded in).
 * @param index - Position, used only for the no-id fallback.
 */
export function elementSegment(
  item: { id?: unknown; blockType?: unknown },
  isBlocks: boolean,
  index: number
): PathSegment {
  const { id } = item;
  if (id === undefined || id === null) return { kind: "index", index };

  const idStr = String(id);
  return isBlocks && typeof item.blockType === "string"
    ? { kind: "element", id: idStr, blockType: item.blockType }
    : { kind: "element", id: idStr };
}
