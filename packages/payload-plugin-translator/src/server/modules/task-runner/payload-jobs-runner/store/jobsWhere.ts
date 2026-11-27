import type { Where } from "payload";

/**
 * `input.handle` is a real column, so this compares rather than traversing a `json` value — a JSON
 * path here hits the drizzle SQLite bug these queries step around.
 */
export const ofHandles = (handles: readonly string[]): Where => ({
  "input.handle": { in: [...handles] },
});
