import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  RangeSelection,
  SerializedElementNode,
} from "lexical";

import { $applyNodeReplacement, addClassNamesToElement, ElementNode } from "lexical";

import { isPlainObject } from "../../../shared/plainObject.js";
import { isAllowedLinkUrl } from "../../../shared/richText/linkUrls.js";

export type LinkFields = Record<string, unknown>;

export type SerializedPageLink = SerializedElementNode & { fields?: unknown; id?: unknown };

const LINK_NODE_TYPE = "link";
const NEW_LINK_VERSION = 3;
const CUSTOM_LINK_TYPE = "custom";
const LINK_ID_BYTES = 12;
const HEX_RADIX = 16;
const HEX_DIGITS_PER_BYTE = 2;

const newLinkId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(LINK_ID_BYTES)), (byte) =>
    byte.toString(HEX_RADIX).padStart(HEX_DIGITS_PER_BYTE, "0")
  ).join("");

export const linkFieldsOf = (fields: unknown): LinkFields => (isPlainObject(fields) ? fields : {});

const fieldsOfCustomLink = ({ doc: _doc, ...fields }: LinkFields, url: string): LinkFields => ({
  newTab: false,
  ...fields,
  linkType: CUSTOM_LINK_TYPE,
  url,
});

const shownAddressOf = (fields: LinkFields): string | null => {
  const { linkType, url } = fields;
  return linkType === CUSTOM_LINK_TYPE && typeof url === "string" && isAllowedLinkUrl(url)
    ? url
    : null;
};

const showAddress = (anchor: HTMLAnchorElement, fields: LinkFields): void => {
  const address = shownAddressOf(fields);
  if (address === null) anchor.removeAttribute("href");
  else anchor.setAttribute("href", address);
};

export class PageLinkNode extends ElementNode {
  __fields: LinkFields;
  __id: string | undefined;
  __version: number;

  constructor(fields: LinkFields, id: string | undefined, version: number, key?: NodeKey) {
    super(key);
    this.__fields = fields;
    this.__id = id;
    this.__version = version;
  }

  static override getType(): string {
    return LINK_NODE_TYPE;
  }

  static $create(url: string): PageLinkNode {
    return $applyNodeReplacement(
      new PageLinkNode(fieldsOfCustomLink({}, url), newLinkId(), NEW_LINK_VERSION)
    );
  }

  static override clone(node: PageLinkNode): PageLinkNode {
    return new PageLinkNode(node.__fields, node.__id, node.__version, node.__key);
  }

  static override importJSON(serialized: SerializedPageLink): PageLinkNode {
    const { fields, id, version } = serialized;
    const node = new PageLinkNode(
      linkFieldsOf(fields),
      typeof id === "string" ? id : undefined,
      version
    );
    return $applyNodeReplacement(node).updateFromJSON(serialized);
  }

  override exportJSON(): SerializedPageLink {
    return {
      ...super.exportJSON(),
      fields: this.getFields(),
      ...(this.getLatest().__id !== undefined && { id: this.getLatest().__id }),
      version: this.getLatest().__version,
    };
  }

  override createDOM(config: EditorConfig): HTMLElement {
    const anchor = document.createElement("a");
    addClassNamesToElement(anchor, config.theme.link);
    showAddress(anchor, this.__fields);
    return anchor;
  }

  override updateDOM(_previous: this, anchor: HTMLAnchorElement): boolean {
    showAddress(anchor, this.__fields);
    return false;
  }

  getFields(): LinkFields {
    return this.getLatest().__fields;
  }

  getUrl(): string {
    const { url } = this.getFields();
    return typeof url === "string" ? url : "";
  }

  setUrl(url: string): this {
    const writable = this.getWritable();
    writable.__fields = fieldsOfCustomLink(writable.__fields, url);
    return writable;
  }

  override canBeEmpty(): false {
    return false;
  }

  override canInsertTextBefore(): false {
    return false;
  }

  override canInsertTextAfter(): false {
    return false;
  }

  override isInline(): true {
    return true;
  }

  override insertNewAfter(_selection: RangeSelection, restoreSelection = true): ElementNode {
    const link = this.$copyWithoutChildren();
    this.insertAfter(link, restoreSelection);
    return link;
  }

  $copyWithoutChildren(): PageLinkNode {
    return $applyNodeReplacement(
      new PageLinkNode(this.getFields(), newLinkId(), this.getLatest().__version)
    );
  }

  override extractWithChild(): boolean {
    return false;
  }
}

export const $isPageLinkNode = (node: LexicalNode | null | undefined): node is PageLinkNode =>
  node instanceof PageLinkNode;
