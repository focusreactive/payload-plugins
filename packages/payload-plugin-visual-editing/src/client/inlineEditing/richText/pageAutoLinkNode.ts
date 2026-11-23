import type { SerializedPageLink } from "./pageLinkNode.js";

import { $applyNodeReplacement } from "lexical";

import { linkFieldsOf, PageLinkNode } from "./pageLinkNode.js";

const AUTO_LINK_NODE_TYPE = "autolink";

export class PageAutoLinkNode extends PageLinkNode {
  static override getType(): string {
    return AUTO_LINK_NODE_TYPE;
  }

  static override clone(node: PageAutoLinkNode): PageAutoLinkNode {
    return new PageAutoLinkNode(node.__fields, node.__id, node.__version, node.__key);
  }

  static override importJSON(serialized: SerializedPageLink): PageAutoLinkNode {
    const { fields, id, version } = serialized;
    const node = new PageAutoLinkNode(
      linkFieldsOf(fields),
      typeof id === "string" ? id : undefined,
      version
    );
    return $applyNodeReplacement(node).updateFromJSON(serialized);
  }

  override $copyWithoutChildren(): PageAutoLinkNode {
    return $applyNodeReplacement(
      new PageAutoLinkNode(this.getFields(), undefined, this.getLatest().__version)
    );
  }
}
