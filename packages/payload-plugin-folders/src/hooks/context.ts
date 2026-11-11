import type { PayloadRequest } from "payload";

/**
 * The plugin's own writes (the move core, the locale write-back, tests that craft stored data) set
 * `context.foldersInternal` so the hooks do not validate and recompute them a second time.
 */
export const isInternalWrite = (req: PayloadRequest): boolean =>
  Boolean(req.context?.foldersInternal);

/**
 * Set by the MCP guard when it takes an echoed fallback slug out of an update. Payload then fills
 * the missing slug back in from the stored document as an empty value, which `beforeValidate`
 * would read as "the caller sent it empty" and derive a slug from the name.
 */
export const slugNotSentContextKey = "foldersSlugNotSent";

/**
 * Set by the folder's save hook on the request context when the rename queued a batch of redirects
 * plugin rows, so a caller that saved the folder can step the batch it started.
 */
export const mirrorOperationContextKey = "foldersMirrorOperationId";

/**
 * Set by `applyTreeChange` to the id of the folder whose rename the user previewed and confirmed,
 * so the guard on the stock MCP update lets that one write change the slug.
 */
export const mcpRenameConfirmedContextKey = "foldersMcpRenameConfirmed";
