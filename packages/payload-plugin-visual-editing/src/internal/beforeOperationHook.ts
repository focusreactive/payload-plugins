import type { CollectionBeforeOperationHook, GlobalBeforeReadHook } from "payload";

export const DRAFT_CONTEXT_KEY = "__visualEditingDraft";

export const createBeforeOperationHook = (): CollectionBeforeOperationHook => {
  return ({ args, operation, req }) => {
    if (operation !== "read") return;
    const draft = args.draft === true;
    req.context[DRAFT_CONTEXT_KEY] = draft;
  };
};

export const createGlobalBeforeReadHook = (): GlobalBeforeReadHook => {
  return ({ req }) => {
    const draft = req.query?.draft === "true" || req.query?.draft === true;
    req.context[DRAFT_CONTEXT_KEY] = draft;
  };
};
