// Cancelable: a listener that calls preventDefault() opens the field itself (e.g. stacked panels).
export const OPEN_FIELD_EVENT = "payload:open-field";

export type OpenFieldEventDetail = {
  path: string;
  collectionSlug?: string;
  globalSlug?: string;
  docId?: string;
  locale?: string;
};

/** Returns `true` when a listener took over by calling `preventDefault()`. */
export const announceOpenField = (detail: OpenFieldEventDetail): boolean => {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") {
    return false;
  }
  const event = new CustomEvent<OpenFieldEventDetail>(OPEN_FIELD_EVENT, {
    cancelable: true,
    detail,
  });
  return !window.dispatchEvent(event);
};
