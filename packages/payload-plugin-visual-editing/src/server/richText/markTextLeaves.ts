import { withMarker } from "../../shared/stegaText.js";
import { toRichTextNodeMarker } from "../../shared/richText/nodeKey.js";
import { shapeOf } from "../../shared/richText/shapeOf.js";
import { addressOf, forEachTextLeaf } from "../../shared/richText/textLeaves.js";
import { rootOf } from "../../shared/richText/editorNodes.js";

export const markTextLeaves = (editorState: unknown, fieldAddress: string): void => {
  const root = rootOf(editorState);
  const shape = shapeOf(editorState, fieldAddress);
  if (!root || shape === null) return;
  forEachTextLeaf(root, (leaf, indexes) => {
    if (leaf.text === "") return;
    leaf.text = withMarker(leaf.text, toRichTextNodeMarker(addressOf(indexes), shape));
  });
};
