import type { PayloadRequest } from "payload";

/**
 * The plugin's own writes (the move core, the locale write-back, tests that craft stored data) set
 * `context.foldersInternal` so the hooks do not validate and recompute them a second time.
 */
export const isInternalWrite = (req: PayloadRequest): boolean =>
  Boolean(req.context?.foldersInternal);
