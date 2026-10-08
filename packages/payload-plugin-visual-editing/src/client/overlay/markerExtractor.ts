import type { DocKind, VeIdentity } from "../../internal/shared.js";
import type { TextMatch } from "./stegaScanner.js";

import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_PATH_ATTR,
} from "../../constants.js";

export type Marker = VeIdentity;

export function readMarkerFromAttrs(target: HTMLElement): Marker | null {
  const rawPath = target.getAttribute(DATA_VE_PATH_ATTR);
  const collectionSlug = target.getAttribute(DATA_VE_COLLECTION_ATTR) ?? "";
  if (rawPath === null || !collectionSlug) return null;
  const kind = (target.getAttribute(DATA_VE_KIND_ATTR) as DocKind | null) ?? "collection";
  const docId = target.getAttribute(DATA_VE_DOC_ID_ATTR) ?? undefined;
  const marker: Marker = {
    path: rawPath,
    collectionSlug: collectionSlug as Marker["collectionSlug"],
    kind,
  };
  if (docId !== undefined) marker.docId = docId;
  return marker;
}

// Group text matches by full doc identity AND their nearest <a>/<button>
// ancestor. Two matches that share a relative path but come from different
// documents (e.g. three sibling FeatureSet cards each with `title`) must not
// collapse into one group — their LCA would be the wrapper around all cards,
// producing one giant target instead of a per-card one. The anchor check
// handles the remaining case of the same field rendered twice inside one doc
// (e.g. a link label duplicated for mobile + desktop).
export function groupNodesByPath(
  matches: readonly TextMatch[]
): Array<{ nodes: Text[]; ctx: Marker }> {
  const groups: Array<{ anchor: Element | null; nodes: Text[]; ctx: Marker }> = [];
  for (const m of matches) {
    const anchor = m.textNode.parentElement?.closest("a, button") ?? null;
    const existing = groups.find(
      (g) =>
        g.ctx.path === m.path &&
        g.ctx.collectionSlug === m.collectionSlug &&
        g.ctx.docId === m.docId &&
        g.anchor === anchor
    );
    if (existing) {
      if (!existing.nodes.includes(m.textNode)) existing.nodes.push(m.textNode);
    } else {
      const { textNode: _textNode, ...id } = m;
      groups.push({ anchor, nodes: [m.textNode], ctx: id });
    }
  }
  return groups.map(({ nodes, ctx }) => ({ nodes, ctx }));
}
