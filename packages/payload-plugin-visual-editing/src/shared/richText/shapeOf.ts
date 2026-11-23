import type { EditorNode } from "./editorNodes.js";

import { isTextLeaf } from "./textLeaves.js";
import { childrenOf, rootOf } from "./editorNodes.js";

const FNV_OFFSET_BASIS = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;
const HASH_RADIX = 36;

const utf8 = new TextEncoder();

const describeShape = (node: EditorNode): string => {
  const type = typeof node.type === "string" ? node.type : "";
  if (isTextLeaf(node)) return type;
  return `${type}(${childrenOf(node).map(describeShape).join(",")})`;
};

const hashOf = (description: string): string => {
  let hash = FNV_OFFSET_BASIS;
  for (const byte of utf8.encode(description)) {
    hash = Math.imul(hash ^ byte, FNV_PRIME);
  }
  return (hash >>> 0).toString(HASH_RADIX);
};

export const shapeOf = (editorState: unknown, fieldAddress: string): string | null => {
  const root = rootOf(editorState);
  return root ? hashOf(`${fieldAddress}${describeShape(root)}`) : null;
};
