import type { Where } from "payload";

/**
 * `input.handle` is a real column, so this compares rather than traversing a `json` value — a JSON
 * path here hits the drizzle SQLite bug these queries step around.
 */
export const ofHandles = (handles: readonly string[]): Where => ({
  "input.handle": { in: [...handles] },
});

/** A job queued before 1.0, which has no handle of its own until it is adopted. */
export const withoutAHandle = (): Where => ({ "input.handle": { exists: false } });
