/**
 * Contract with `@focus-reactive/payload-plugin-visual-editing` (no package depends on the other):
 * its admin bridge dispatches this cancelable event on `window` before it expands collapsibles to
 * focus a field the editor clicked in the preview. Stacked editing takes over for fields inside
 * array/blocks rows by cancelling it and opening the panels down to the field.
 */
export const OPEN_FIELD_EVENT = "payload:open-field";

export type OpenFieldDetail = {
  path: string;
  collectionSlug?: string;
  globalSlug?: string;
  docId?: string;
  locale?: string;
};

const ROW_INDEX = /^\d+$/u;

/**
 * Row paths that may contain the field, deepest first: `sections.2.items.0.points.0.text` →
 * `sections.2.items.0.points.0`, `sections.2.items.0`, `sections.2`. The first that resolves to
 * a complete row chain is the panel to open; the rest are its parents.
 */
export const rowPathCandidates = (path: string): string[] => {
  const segments = path.split(".");
  const candidates: string[] = [];
  for (let index = segments.length - 1; index > 0; index -= 1) {
    if (ROW_INDEX.test(segments[index] ?? "")) {
      candidates.push(segments.slice(0, index + 1).join("."));
    }
  }
  return candidates;
};

/** Whether the event is about the document this edit view has open. */
export const isForDocument = (
  detail: Partial<OpenFieldDetail> | null | undefined,
  document: { collectionSlug?: string; globalSlug?: string; id?: number | string | null }
): detail is OpenFieldDetail => {
  if (!detail || typeof detail.path !== "string" || detail.path === "") {
    return false;
  }
  if (detail.globalSlug) {
    return detail.globalSlug === document.globalSlug;
  }
  if (!detail.collectionSlug || detail.collectionSlug !== document.collectionSlug) {
    return false;
  }
  return detail.docId === undefined || String(document.id ?? "") === String(detail.docId);
};
