import type { DocKind } from "../../shared/protocol.js";
import type { VeIdentity } from "../../shared/shared.js";

import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KEY_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_LOCALE_ATTR,
  DATA_VE_PATH_ATTR,
} from "../../shared/protocol.js";
import { veIdentityOf } from "../../shared/shared.js";

export type Marker = VeIdentity;

export function readMarkerFromAttrs(target: HTMLElement): Marker | null {
  const rawPath = target.getAttribute(DATA_VE_PATH_ATTR);
  const collectionSlug = target.getAttribute(DATA_VE_COLLECTION_ATTR) ?? "";
  if (rawPath === null || !collectionSlug) return null;
  return veIdentityOf({
    collectionSlug: collectionSlug as Marker["collectionSlug"],
    docId: target.getAttribute(DATA_VE_DOC_ID_ATTR) ?? undefined,
    key: target.getAttribute(DATA_VE_KEY_ATTR) ?? undefined,
    kind: (target.getAttribute(DATA_VE_KIND_ATTR) as DocKind | null) ?? "collection",
    locale: target.getAttribute(DATA_VE_LOCALE_ATTR) ?? undefined,
    path: rawPath,
  });
}

export function groupNodesByPath(
  matches: ReadonlyArray<Marker & { textNode: Text }>
): Array<{ nodes: Text[]; ctx: Marker }> {
  const groups: Array<{ clickableAncestor: Element | null; nodes: Text[]; ctx: Marker }> = [];
  for (const m of matches) {
    const clickableAncestor = m.textNode.parentElement?.closest("a, button") ?? null;
    const existing = groups.find(
      (g) =>
        g.ctx.path === m.path &&
        g.ctx.collectionSlug === m.collectionSlug &&
        g.ctx.docId === m.docId &&
        g.ctx.locale === m.locale &&
        g.clickableAncestor === clickableAncestor
    );
    if (existing) {
      if (!existing.nodes.includes(m.textNode)) existing.nodes.push(m.textNode);
    } else {
      const { textNode: _textNode, ...id } = m;
      groups.push({ clickableAncestor, nodes: [m.textNode], ctx: id });
    }
  }
  return groups.map(({ nodes, ctx }) => ({ nodes, ctx }));
}
