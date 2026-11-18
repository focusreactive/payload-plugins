import { ACCENT_TEXT_VAR, ACCENT_VAR } from "./overlay/constants.js";

export type AccentOptions = {
  /**
   * Colour of the frames, the Edit badge and the toggle's "on" dot. Pick one that stands apart
   * from the site's own palette. Defaults to violet.
   */
  accentColor?: string;
  /** Text colour on the Edit badge. Defaults to white; use a dark one with a light accent. */
  accentTextColor?: string;
};

/**
 * Sets the accent the overlay and the toggle draw with as custom properties on the page root,
 * and returns how to take them away. Without options the overlay keeps its default violet.
 */
export function applyAccent(
  doc: Document,
  { accentColor, accentTextColor }: AccentOptions
): () => void {
  const root = doc.documentElement;
  if (accentColor) root.style.setProperty(ACCENT_VAR, accentColor);
  if (accentTextColor) root.style.setProperty(ACCENT_TEXT_VAR, accentTextColor);
  return () => {
    if (accentColor) root.style.removeProperty(ACCENT_VAR);
    if (accentTextColor) root.style.removeProperty(ACCENT_TEXT_VAR);
  };
}
