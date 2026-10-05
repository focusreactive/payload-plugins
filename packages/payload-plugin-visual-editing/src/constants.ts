// For elements that can't carry inline stega — e.g. rich-text wrappers where the
// renderer owns the text nodes. Overlay reads it as a fallback path marker.
export const DATA_VE_PATH_ATTR = "data-ve-path";
export const DATA_VE_DOC_ID_ATTR = "data-ve-doc-id";
export const DATA_VE_COLLECTION_ATTR = "data-ve-collection";
export const DATA_VE_KIND_ATTR = "data-ve-kind";

export const STORAGE_KEY = "visual-editing";

// Off: overlay not mounted. Always: outlines painted on every editable target.
// Hover: outline + edit badge only on the element under the cursor.
export type VisualEditingMode = "off" | "always" | "hover";

export const VISUAL_EDITING_MODES: readonly VisualEditingMode[] = ["off", "always", "hover"];

export const VE_MESSAGE_TYPE = "ve:open-field";

export type VeOpenFieldMessage = {
  type: typeof VE_MESSAGE_TYPE;
  path: string;
  docId?: string;
  collectionSlug: string;
  kind: "collection" | "global";
  locale?: string;
};
