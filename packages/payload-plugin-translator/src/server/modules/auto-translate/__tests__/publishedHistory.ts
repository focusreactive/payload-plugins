import { vi } from "vitest";

/**
 * The published rows a layered collection's hook can read while a save is running, newest first —
 * the save in flight, then the publish before it.
 *
 * Rows are given explicitly rather than derived from the hook's `previousDoc`, because the defect
 * this read exists to fix is precisely the two disagreeing: on a publish, `previousDoc` is the
 * draft that already holds the new text while the previous publish still holds the old one.
 */
export const publishedHistory = (...newestFirst: unknown[]) =>
  vi.fn(async () => ({ docs: newestFirst.map((version) => ({ version })) }));
