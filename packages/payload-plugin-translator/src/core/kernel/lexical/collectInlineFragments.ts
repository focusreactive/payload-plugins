/**
 * Groups a Lexical tree into containers and the fragments inside them.
 *
 * Formatting (`format`, `style`, a link's `fields`) is deliberately never read: it travels inside
 * the nodes themselves, which is what lets this layer reorder formatted pieces at all.
 */

import { hasChildren, isSerializedLexicalTextNode } from "./guards";
import type { SerializedLexicalNode, SerializedTextNode } from "./types";

/**
 * One translatable piece of a container.
 *
 * `node` is where the translation is written; `top` is what goes into the container's rebuilt
 * `children`. For a multi-leaf wrapper `top` is a copy holding only this leaf — pushing one
 * shared wrapper once per leaf would duplicate its whole text instead of reordering it.
 */
export type InlineFragment = { markId: number; top: SerializedLexicalNode } & (
  | { text: string; node: SerializedTextNode }
  | { text: null; node: null }
);

/** A fragment that carries text, so `node` is present — what `glueWhitespace` can append to. */
type TextFragment = Extract<InlineFragment, { text: string }>;

export type ContainerSkipReason =
  /** Parsing the reply would be ambiguous — see `MARK_SHAPED`. */
  | "mark-shaped-source"
  /** Nothing to reorder, so marks would be pure cost — not a failure. */
  | "single-leaf"
  | "no-translatable-text"
  /**
   * A multi-leaf wrapper also holding a non-text node: the per-leaf copy keeps only the path down
   * to its leaf, so that node would vanish from every copy with no fragment and no signal.
   */
  | "unsupported-wrapper";

/**
 * `node` is the node whose `children` the caller rebuilds. `fragments` is populated even when
 * `skip` is set.
 */
export type InlineContainer = {
  node: SerializedLexicalNode;
  fragments: InlineFragment[];
  skip?: ContainerSkipReason;
};

// Must stay as wide as MARK_TOKEN in ./inlineMarks — a source this misses is a reply that mis-parses.
const MARK_SHAPED = /<\s*\/?\s*\d+\s*\/?\s*>/u;

const isBlank = (text: string): boolean => text.trim().length === 0;

const hasDirectTextChild = (node: SerializedLexicalNode): boolean =>
  hasChildren(node) && node.children.some((child) => isSerializedLexicalTextNode(child));

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
  | ({ kind: "fragment"; top: SerializedLexicalNode } & (
      | { text: string; node: SerializedTextNode }
      | { text: null; node: null }
    ))
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
  const lastWithText = (): TextFragment | undefined => {
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

    const markId = fragments.length + 1;
    if (draft.text === null) {
      fragments.push({ markId, text: null, node: null, top: draft.top });
      continue;
    }

    const text = carried.length > 0 ? carried.splice(0).join("") + draft.text : draft.text;
    fragments.push({ markId, text, node: draft.node, top: draft.top });
  }

  return fragments;
};

// Ordered: an unsupported shape and an ambiguous source are correctness problems, so they outrank
// the last two, which only decide whether marks would pay for themselves.
const skipReasonFor = (
  drafts: Draft[],
  fragments: InlineFragment[]
): ContainerSkipReason | undefined => {
  if (drafts.some((draft) => draft.kind === "unsupported")) return "unsupported-wrapper";

  const texts = fragments.flatMap((fragment) => (fragment.text === null ? [] : [fragment.text]));

  if (texts.some((text) => MARK_SHAPED.test(text))) return "mark-shaped-source";
  if (!texts.some((text) => !isBlank(text))) return "no-translatable-text";
  if (fragments.length === 1) return "single-leaf";
  return undefined;
};

/**
 * Walks a serialized Lexical tree and returns its containers, in document order.
 *
 * A **container** is the nearest node with at least one direct text child; the walk stops there.
 * Naming no node types is deliberate — the rule holds for paragraphs, headings, list items and
 * whatever is added later. The cost: a node mixing its own inline text with a nested block is
 * treated as a container, and the block becomes content. Real Lexical trees do not mix the two.
 *
 * Fragments are numbered from 1 within each container — the container is one string, so the
 * numbering restarts.
 *
 * The input tree is not mutated, but a fragment's `node` may BE a source node: writing to it
 * writes into the caller's tree.
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
    const skip = skipReasonFor(drafts, fragments);

    containers.push({
      node,
      fragments,
      ...(skip ? { skip } : {}),
    });
  };

  visit(root);
  return containers;
}
