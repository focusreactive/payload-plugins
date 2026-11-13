import type { PathChangeReason } from "../../src/types.js";

/**
 * Creating or publishing a page in a fixture reports `create`, `publish` or `rootToggle`. Tests
 * about moves, deletes and repairs record the hook's calls and must not see those.
 */
export const isPageSaveReason = (reason: PathChangeReason): boolean =>
  reason === "create" || reason === "publish" || reason === "rootToggle";
