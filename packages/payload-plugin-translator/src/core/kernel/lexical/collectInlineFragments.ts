/**
 * Container-level collection: groups a Lexical tree into the units that get translated as one
 * string each, and the fragments inside them.
 *
 * Reads only `type`, `text` and `children` — the surface `types.ts` declares. Formatting
 * (`format`, `style`, a link's `fields`) is never read: it travels inside the nodes themselves,
 * which is what lets this layer reorder formatted pieces without understanding formatting.
 *
 * The existing per-node walk (`collectTextNodes.ts`) is left alone: it feeds the per-node
 * translation path and the provenance fingerprint, and widening it would change stored
 * fingerprint values.
 *
 * Design: `docs/plans/2026-09-08-richtext-container-granularity-design.md` §4 (D1, D3, D6, D15, D17).
 */

import { hasChildren, isSerializedLexicalTextNode } from "./guards";
import type { SerializedLexicalNode, SerializedTextNode } from "./types";

/**
 * One translatable piece of a container.
 *
 * `node` is where the translation is written; `top` is what goes into the container's rebuilt
 * `children`. They are usually two views of the same subtree — `node` the leaf, `top` the
 * container's direct child above it.
 *
 * When the container's direct child holds more than one leaf (a link with an emphasised word
 * inside), `top` is instead a **copy** of that child holding only this fragment's leaf, and
 * `node` points into that copy. Pushing one shared wrapper once per leaf would duplicate its
 * whole text rather than reorder it.
 *
 * `text` and `node` are `null` together, for a fragment that carries no text at all.
 */
export type InlineFragment = {
  markId: number;
  text: string | null;
  node: SerializedTextNode | null;
  top: SerializedLexicalNode;
};

/** Why a container cannot use the marked format, when it cannot. */
export type ContainerSkipReason =
  /** Its source text contains a mark-shaped sequence, so parsing a reply would be ambiguous. */
  | "mark-shaped-source"
  /** A single text leaf: nothing to reorder, so marks would be pure cost. */
  | "single-leaf"
  | "no-translatable-text"
  /**
   * A wrapper holds several leaves *and* a node that is neither: copying the wrapper once per
   * leaf keeps only the path down to that leaf, so the odd node would be dropped from every copy
   * — silently, with no fragment of its own. Skipping is honest where a copy is not.
   */
  | "unsupported-wrapper";

/**
 * A container and its fragments.
 *
 * `node` is the node whose `children` the caller will rebuild. When `skip` is set the caller
 * translates this container the per-node way instead, and `fragments` is still populated so
 * the decision needs no second walk.
 */
export type InlineContainer = {
  node: SerializedLexicalNode;
  fragments: InlineFragment[];
  skip?: ContainerSkipReason;
};

const MARK_SHAPED = /<\s*\/?\s*\d+\s*\/?\s*>/u;

const isBlank = (text: string): boolean => text.trim().length === 0;

const hasDirectTextChild = (node: SerializedLexicalNode): boolean =>
  hasChildren(node) && node.children.some((child) => isSerializedLexicalTextNode(child));

/** A node with no children that is not text: a line break, an inline block, an upload. */
const hasNonTextLeafInside = (node: SerializedLexicalNode): boolean => {
  if (isSerializedLexicalTextNode(node)) return false;
  if (!hasChildren(node)) return true;
  return node.children.some(hasNonTextLeafInside);
};

const leavesOf = (node: SerializedLexicalNode): SerializedTextNode[] => {
  if (isSerializedLexicalTextNode(node)) return [node];
  if (!hasChildren(node)) return [];
  return node.children.flatMap(leavesOf);
};

/** Copies never share a mutable node: each leaf gets its own chain down from the container's child. */
const copyChainToLeaf = (
  node: SerializedLexicalNode,
  leaf: SerializedTextNode
): { copy: SerializedLexicalNode; leaf: SerializedTextNode } | null => {
  if ((node as SerializedTextNode) === leaf) {
    const copy = { ...leaf };
    return { copy, leaf: copy };
  }
  if (!hasChildren(node)) return null;

  for (const child of node.children) {
    const found = copyChainToLeaf(child, leaf);
    if (found) {
      const copy = { ...node, children: [found.copy] };
      return { copy, leaf: found.leaf };
    }
  }
  return null;
};

type Draft =
  | {
      kind: "fragment";
      text: string | null;
      node: SerializedTextNode | null;
      top: SerializedLexicalNode;
    }
  | { kind: "glue"; text: string }
  | { kind: "unsupported" };

const draftsOf = (container: SerializedLexicalNode): Draft[] => {
  if (!hasChildren(container)) return [];

  return container.children.flatMap((child): Draft[] => {
    if (isSerializedLexicalTextNode(child)) {
      return isBlank(child.text)
        ? [{ kind: "glue", text: child.text }]
        : [{ kind: "fragment", text: child.text, node: child, top: child }];
    }

    const leaves = leavesOf(child).filter((leaf) => !isBlank(leaf.text));

    if (leaves.length === 0) {
      return [{ kind: "fragment", text: null, node: null, top: child }];
    }
    if (leaves.length === 1) {
      const leaf = leaves[0];
      return leaf ? [{ kind: "fragment", text: leaf.text, node: leaf, top: child }] : [];
    }

    if (hasNonTextLeafInside(child)) return [{ kind: "unsupported" }];

    return leaves.flatMap((leaf): Draft[] => {
      const copied = copyChainToLeaf(child, leaf);
      return copied
        ? [{ kind: "fragment", text: copied.leaf.text, node: copied.leaf, top: copied.copy }]
        : [];
    });
  });
};

const glueWhitespace = (drafts: Draft[]): InlineFragment[] => {
  const carried: string[] = [];
  const fragments: InlineFragment[] = [];

  // Searching backwards has to skip text-free fragments: a line break between the text and the
  // whitespace must not send the glue forwards, and at the end of a container it would drop it.
  const lastWithText = (): InlineFragment | undefined => {
    for (let index = fragments.length - 1; index >= 0; index -= 1) {
      const candidate = fragments[index];
      if (candidate && candidate.text !== null) return candidate;
    }
    return undefined;
  };

  for (const draft of drafts) {
    if (draft.kind === "unsupported") continue;
    if (draft.kind === "glue") {
      const previous = lastWithText();
      if (previous) previous.text += draft.text;
      else carried.push(draft.text);
      continue;
    }

    const text =
      draft.text !== null && carried.length > 0
        ? carried.splice(0).join("") + draft.text
        : draft.text;
    fragments.push({ markId: fragments.length + 1, text, node: draft.node, top: draft.top });
  }

  return fragments;
};

const skipReasonFor = (fragments: InlineFragment[]): ContainerSkipReason | undefined => {
  const texts = fragments.flatMap((fragment) => (fragment.text === null ? [] : [fragment.text]));

  if (texts.some((text) => MARK_SHAPED.test(text))) return "mark-shaped-source";
  if (!texts.some((text) => !isBlank(text))) return "no-translatable-text";
  if (fragments.length === 1) return "single-leaf";
  return undefined;
};

/**
 * Walks a serialized Lexical tree and returns its containers, in document order.
 *
 * A **container** is the nearest node with at least one direct text child. The walk descends
 * until it finds one, then stops: everything below belongs to that container as its content.
 * Naming no node types is deliberate — the rule holds for paragraphs, headings, list items and
 * quotes alike, and for whatever is added later. The cost is that a node holding both its own
 * inline text and a nested block cannot be told apart from a paragraph holding a link, so the
 * nested block is treated as content. Real Lexical trees do not mix the two.
 *
 * Guarantees:
 * - fragments are in document order, numbered from 1 within each container — the container is
 *   one string, so numbering restarts;
 * - a leaf holding only whitespace (or nothing) never becomes a fragment: its text is glued
 *   onto the nearest fragment that carries text, searching backwards first, then forwards, so
 *   the gap between two words survives and its node drops out. Such a leaf still counts as a
 *   direct text child when deciding whether a node is a container;
 * - copies duplicate the whole chain from the container's direct child down to the leaf, so two
 *   copies never share a mutable node;
 * - **the input tree is not mutated** — the source nodes are read only;
 * - a root with no `children` yields an empty list rather than throwing.
 *
 * @param root - the root node of a serialized Lexical value
 */
export function collectInlineFragments(root: SerializedLexicalNode): InlineContainer[] {
  const containers: InlineContainer[] = [];

  const visit = (node: SerializedLexicalNode): void => {
    if (!hasDirectTextChild(node)) {
      if (hasChildren(node)) for (const child of node.children) visit(child);
      return;
    }

    const drafts = draftsOf(node);
    const fragments = glueWhitespace(drafts);
    const skip = drafts.some((draft) => draft.kind === "unsupported")
      ? "unsupported-wrapper"
      : skipReasonFor(fragments);

    containers.push({
      node,
      fragments,
      ...(skip ? { skip } : {}),
    });
  };

  visit(root);
  return containers;
}
