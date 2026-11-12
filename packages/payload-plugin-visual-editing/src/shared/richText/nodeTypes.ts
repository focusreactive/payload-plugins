export const TEXT_NODE_TYPES: ReadonlySet<unknown> = new Set(["text", "tab", "code-highlight"]);

export const BLOCK_NODE_TYPES: ReadonlySet<unknown> = new Set(["block", "inlineBlock"]);

export const LINK_NODE_TYPES: ReadonlySet<unknown> = new Set(["autolink", "link"]);

export const UPLOAD_NODE_TYPE = "upload";

export const RELATED_VALUE_NODE_TYPES: ReadonlySet<unknown> = new Set([
  "relationship",
  UPLOAD_NODE_TYPE,
]);
