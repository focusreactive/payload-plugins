import type { PayloadRequest } from "payload";

import { DRAFT_CONTEXT_KEY } from "./beforeOperationHook.js";

export const shouldEnrich = (req: PayloadRequest, adminBasePath: string): boolean => {
  const context = req.context;

  const override = context?.visualEditing;
  if (typeof override === "boolean") return override;

  if (context?.[DRAFT_CONTEXT_KEY] !== true) return false;
  if (req.payloadAPI !== "local") return false;

  // The admin edit view also reads via Local API + draft:true; only its pathname
  // (under the admin base path) sets it apart from a frontend RSC render. Skip it
  // so stega doesn't leak into form inputs (and persist on save).
  if ((req.pathname ?? "").startsWith(adminBasePath)) return false;

  return true;
};
