import type { ElementNode, LexicalNode, RangeSelection } from "lexical";

import { $isTextNode } from "lexical";

import { $isPageLinkNode, PageLinkNode } from "./pageLinkNode.js";

export const $linkAround = (node: LexicalNode): PageLinkNode | null => {
  for (let ancestor: LexicalNode | null = node; ancestor; ancestor = ancestor.getParent()) {
    if ($isPageLinkNode(ancestor)) return ancestor;
  }
  return null;
};

export const $unwrapLink = (link: PageLinkNode): void => {
  for (const child of link.getChildren()) link.insertBefore(child);
  link.remove();
};

export const $removeLinks = (selection: RangeSelection): void => {
  const links = new Set(selection.getNodes().flatMap((node) => $linkAround(node) ?? []));
  for (const link of links) $unwrapLink(link);
};

export const $setLink = (selection: RangeSelection, url: string): void => {
  let wrappedParent: ElementNode | null = null;
  let wrapper: PageLinkNode | null = null;
  for (const node of selection.extract()) {
    const parent = node.getParent();
    const around = $linkAround(node);
    if (around) {
      around.setUrl(url);
    } else if (parent && $isTextNode(node)) {
      if (!wrapper || !parent.is(wrappedParent) || !wrapper.is(node.getPreviousSibling())) {
        wrapper = PageLinkNode.$create(url);
        wrappedParent = parent;
        node.insertBefore(wrapper);
      }
      wrapper.append(node);
    }
  }
};
