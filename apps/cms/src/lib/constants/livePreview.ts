/**
 * Live Preview re-renders the frontend after every save, so autosave is what makes it follow typing.
 * Each save writes the whole draft and re-renders the page, so a save waits for a 300 ms pause in
 * typing instead of firing on almost every keystroke.
 */
export const LIVE_PREVIEW_AUTOSAVE_INTERVAL_MS = 300;
