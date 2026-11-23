import type { KeepsShape } from "../liveFields.js";

export type SavedRichTextShapes = {
  keeps: KeepsShape;
  name(richTextField: string, shape: string): () => void;
};

type NamedShape = { richTextField: string; shape: string };

export function createSavedRichTextShapes(): SavedRichTextShapes {
  const named = new Set<NamedShape>();
  return {
    keeps: (richTextField, shape) =>
      [...named].some((entry) => entry.richTextField === richTextField && entry.shape === shape),
    name(richTextField, shape) {
      const entry = { richTextField, shape };
      named.add(entry);
      return () => {
        named.delete(entry);
      };
    },
  };
}
