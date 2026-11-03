import type { FieldHook, PayloadRequest } from "payload";

// A collection `beforeValidate` hook is never told whether the caller overrode access; a field
// hook is. This one runs right before the collection hooks of the same operation and leaves the
// answer for them. It is kept per request and rewritten by every save, and it is not set in an
// earlier step (`beforeOperation`) because a host's access function may make a nested Local API
// call on the same request in between, which would overwrite it.
const overrideByRequest = new WeakMap<PayloadRequest, boolean>();

export const buildMarkOverrideAccessHook =
  (): FieldHook =>
  ({ overrideAccess, req }) => {
    overrideByRequest.set(req, overrideAccess === true);
  };

/** False when no mark is there, so a message names no page it should not. */
export const isAccessOverridden = (req: PayloadRequest): boolean =>
  overrideByRequest.get(req) === true;
