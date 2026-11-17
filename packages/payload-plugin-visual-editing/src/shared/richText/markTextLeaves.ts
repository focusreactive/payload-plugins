import { withMarker } from "../stegaText.js";
import { toRichTextNodeMarker } from "./nodeKey.js";
import { shapeOf } from "./shapeOf.js";
import { addressOf, forEachTextLeaf } from "./textLeaves.js";
import { rootOf } from "./editorNodes.js";

export const markTextLeaves = (editorState: unknown, fieldAddress: string): void => {
  const root = rootOf(editorState);
  const shape = shapeOf(editorState, fieldAddress);
  if (!root || shape === null) return;
  forEachTextLeaf(root, (leaf, indexes) => {
    if (leaf.text === "") return;
    leaf.text = withMarker(leaf.text, toRichTextNodeMarker(addressOf(indexes), shape));
  });
};
