import type { DOMExportOutput, LexicalNode, NodeKey, SerializedLexicalNode } from "lexical";

import { DecoratorNode } from "lexical";

import type { EditorNode } from "../../../shared/richText/editorNodes.js";
import type { OpaqueNodeJson } from "./editableState.js";

import { isPlainObject } from "../../../shared/plainObject.js";
import { ACCENT_VAR, DEFAULT_ACCENT } from "../../overlay/constants.js";
import { OPAQUE_NODE_TYPE, OPAQUE_NODE_VERSION } from "./editableState.js";

export const DATA_VE_OPAQUE_ATTR = "data-ve-opaque";

export const DATA_VE_OPAQUE_SELECTED_ATTR = "data-ve-opaque-selected";

const NOT_EDITABLE = "false";

const OPAQUE_STYLES: Partial<CSSStyleDeclaration> = {
  border: `1px dashed var(${ACCENT_VAR}, ${DEFAULT_ACCENT})`,
  borderRadius: "4px",
  cursor: "default",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: "12px",
  fontWeight: "500",
  lineHeight: "1.4",
  opacity: "0.8",
  padding: "2px 8px",
  userSelect: "none",
};

const BLOCK_OPAQUE_STYLES: Partial<CSSStyleDeclaration> = { display: "block", margin: "8px 0" };

const INLINE_OPAQUE_STYLES: Partial<CSSStyleDeclaration> = {
  display: "inline-block",
  margin: "0 2px",
};

const nameOf = ({ fields, type }: EditorNode): string => {
  const blockType = isPlainObject(fields) ? fields.blockType : undefined;
  const typeName = typeof type === "string" ? type : "";
  return typeof blockType === "string" ? `${typeName}: ${blockType}` : typeName;
};

type SerializedOpaqueNode = SerializedLexicalNode & OpaqueNodeJson;

export class OpaqueNode extends DecoratorNode<null> {
  __kept: EditorNode;
  __isInline: boolean;

  constructor(kept: EditorNode, isInline: boolean, key?: NodeKey) {
    super(key);
    this.__kept = kept;
    this.__isInline = isInline;
  }

  static override getType(): string {
    return OPAQUE_NODE_TYPE;
  }

  static override clone(node: OpaqueNode): OpaqueNode {
    return new OpaqueNode(node.__kept, node.__isInline, node.__key);
  }

  static override importJSON({ isInline, kept }: SerializedOpaqueNode): OpaqueNode {
    return new OpaqueNode(kept, isInline);
  }

  override exportJSON(): SerializedOpaqueNode {
    return {
      isInline: this.__isInline,
      kept: this.__kept,
      type: OPAQUE_NODE_TYPE,
      version: OPAQUE_NODE_VERSION,
    };
  }

  override createDOM(): HTMLElement {
    const placeholder = document.createElement(this.__isInline ? "span" : "div");
    placeholder.setAttribute(DATA_VE_OPAQUE_ATTR, nameOf(this.__kept));
    placeholder.contentEditable = NOT_EDITABLE;
    placeholder.textContent = nameOf(this.__kept);
    Object.assign(
      placeholder.style,
      OPAQUE_STYLES,
      this.__isInline ? INLINE_OPAQUE_STYLES : BLOCK_OPAQUE_STYLES
    );
    return placeholder;
  }

  override updateDOM(): false {
    return false;
  }

  override exportDOM(): DOMExportOutput {
    return { element: null };
  }

  override getTextContent(): string {
    return "";
  }

  override isInline(): boolean {
    return this.__isInline;
  }

  override isKeyboardSelectable(): boolean {
    return true;
  }

  override decorate(): null {
    return null;
  }
}

export const $isOpaqueNode = (node: LexicalNode | null | undefined): node is OpaqueNode =>
  node instanceof OpaqueNode;
