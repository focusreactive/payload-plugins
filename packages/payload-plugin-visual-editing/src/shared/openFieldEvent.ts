/**
 * A cancelable DOM event the admin bridge dispatches on `window` before it expands collapsibles
 * and focuses a field the editor clicked in the preview. Another admin component that shows
 * fields differently (for example stacked panels) can take over: it calls `preventDefault()` and
 * opens the field itself. If nobody cancels, the bridge expands and focuses the field inline as
 * before.
 */
export const OPEN_FIELD_EVENT = "payload:open-field";

export type OpenFieldEventDetail = {
  /** Data path of the field in the open form, e.g. `layout.0.items.1.title`. */
  path: string;
  collectionSlug?: string;
  globalSlug?: string;
  docId?: string;
  locale?: string;
};

/** Dispatches the event; `true` when a listener took over (called `preventDefault()`). */
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
