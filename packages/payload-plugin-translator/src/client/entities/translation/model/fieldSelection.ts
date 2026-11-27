import type { LeafVerdict, TreeNode } from "../../../../types/wire/DocumentTranslationState.js";
import type { LeafAddress } from "../../../../types/wire/primitives.js";

/** The leaves picked for a partial run. */
export type FieldSelection = ReadonlySet<LeafAddress>;

export type CheckState = "checked" | "unchecked" | "mixed";

export function addressesOf(node: TreeNode): LeafAddress[] {
  if (node.kind === "leaf") return [node.address];
  if (node.kind === "whole-list") return [...node.addresses];
  return node.children.flatMap(addressesOf);
}

export function allAddresses(tree: readonly TreeNode[]): LeafAddress[] {
  return tree.flatMap(addressesOf);
}

const needsTranslation = (verdict: LeafVerdict | undefined): boolean =>
  verdict !== undefined && verdict !== "current";

/** The items a locale owes: every leaf not current, and a whole list in whole if any leaf of it is. */
function owedOf(
  node: TreeNode,
  verdicts: Readonly<Record<LeafAddress, LeafVerdict>>
): LeafAddress[] {
  if (node.kind === "group") return node.children.flatMap((child) => owedOf(child, verdicts));
  const addresses = addressesOf(node);
  return addresses.some((address) => needsTranslation(verdicts[address])) ? addresses : [];
}

export function initialSelection(
  tree: readonly TreeNode[],
  verdicts: Readonly<Record<LeafAddress, LeafVerdict>>
): FieldSelection {
  return new Set(tree.flatMap((node) => owedOf(node, verdicts)));
}

export function checkStateOf(node: TreeNode, selection: FieldSelection): CheckState {
  const addresses = addressesOf(node);
  const picked = addresses.filter((address) => selection.has(address)).length;
  if (picked === 0) return "unchecked";
  return picked === addresses.length ? "checked" : "mixed";
}

export function toggleNode(node: TreeNode, selection: FieldSelection): FieldSelection {
  const addresses = addressesOf(node);
  const next = new Set(selection);
  if (checkStateOf(node, selection) === "checked") {
    for (const address of addresses) next.delete(address);
  } else {
    for (const address of addresses) next.add(address);
  }
  return next;
}

export function selectedInTreeOrder(
  tree: readonly TreeNode[],
  selection: FieldSelection
): LeafAddress[] {
  return allAddresses(tree).filter((address) => selection.has(address));
}

function matching(node: TreeNode, query: string): TreeNode | null {
  if (node.label.toLowerCase().includes(query)) return node;
  if (node.kind !== "group") return null;
  const children = node.children.flatMap((child) => matching(child, query) ?? []);
  return children.length > 0 ? { ...node, children } : null;
}

/** Nodes whose label holds the query, with their ancestors; a matching group keeps all it holds. */
export function filterTree(tree: readonly TreeNode[], query: string): readonly TreeNode[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return tree;
  return tree.flatMap((node) => matching(node, needle) ?? []);
}
