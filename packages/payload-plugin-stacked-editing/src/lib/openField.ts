// Contract with the visual-editing bridge: it dispatches this cancelable event before focusing a field inline.
export const OPEN_FIELD_EVENT = "payload:open-field";

export type OpenFieldDetail = {
  path: string;
  collectionSlug?: string;
  globalSlug?: string;
  docId?: string;
  locale?: string;
};

const ROW_INDEX = /^\d+$/u;

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

export const rowDepthOf = (rowPath: string): number =>
  rowPath.split(".").filter((segment) => ROW_INDEX.test(segment)).length;
