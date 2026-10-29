import type { CollectionBeforeOperationHook, PayloadRequest } from "payload";

// The `beforeChange` hook is not told whether the caller overrode access, but `beforeOperation`
// is. The answer is kept per request and read by the same operation's `beforeChange`.
const overrideAccessByRequest = new WeakMap<PayloadRequest, boolean>();

export const recordOverrideAccessHook: CollectionBeforeOperationHook = ({ args, req }) => {
  overrideAccessByRequest.set(req, Boolean((args as { overrideAccess?: boolean }).overrideAccess));
};

/** Whether the operation running on `req` skips access control; false when unknown, so access is asked. */
export const isAccessOverridden = (req: PayloadRequest): boolean =>
  overrideAccessByRequest.get(req) ?? false;
