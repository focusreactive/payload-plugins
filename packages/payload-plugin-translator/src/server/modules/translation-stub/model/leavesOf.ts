import type { LeafAddress } from "../../../../types/wire/primitives.js";
import type { TreeNode } from "../../../../types/wire/DocumentTranslationState.js";

export function leavesOf(tree: readonly TreeNode[]): LeafAddress[] {
  return tree.flatMap((node) => {
    if (node.kind === "group") return leavesOf(node.children);
    if (node.kind === "whole-list") return [...node.addresses];
    return [node.address];
  });
}

export function requiredLeavesOf(tree: readonly TreeNode[]): LeafAddress[] {
  return tree.flatMap((node) => {
    if (node.kind === "group") return requiredLeavesOf(node.children);
    if (node.kind === "leaf" && node.required) return [node.address];
    return [];
  });
}
