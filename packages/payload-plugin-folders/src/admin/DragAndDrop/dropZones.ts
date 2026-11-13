/** Where on a row the pointer is: above it, on it, or below it (spec section 7.3). */
export type DropZone = "after" | "before" | "inside";

/**
 * The zone of a row from the pointer's height on it. A folder takes the top quarter as before and
 * the bottom quarter as after, so the middle half is "inside"; a page cannot hold anything, so it
 * splits in two halves.
 */
export const dropZoneOf = (
  kind: "folder" | "page",
  pointerY: number,
  rect: { height: number; top: number }
): DropZone => {
  const ratio = rect.height <= 0 ? 0.5 : (pointerY - rect.top) / rect.height;
  if (kind === "page") {
    return ratio < 0.5 ? "before" : "after";
  }
  if (ratio < 0.25) {
    return "before";
  }

  return ratio >= 0.75 ? "after" : "inside";
};
