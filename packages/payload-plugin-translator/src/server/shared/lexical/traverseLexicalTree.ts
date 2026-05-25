import { hasChildren } from "./guards";
import type { SerializedLexicalNode } from "./types";

/**
 * Traverses serialized Lexical tree depth-first and calls visitor for each node.
 * Stops early if visitor returns false.
 *
 * @param node - The serialized Lexical node to traverse
 * @param visitor - Callback for each node. Return false to stop traversal.
 * @returns false if traversal was stopped early, true otherwise
 */
export function traverseLexicalTree(
  node: SerializedLexicalNode,
  visitor: (node: SerializedLexicalNode) => boolean | void
): boolean {
  if (visitor(node) === false) {return false;}

  if (hasChildren(node)) {
    for (const child of node.children) {
      if (traverseLexicalTree(child, visitor) === false) {return false;}
    }
  }
  return true;
}
