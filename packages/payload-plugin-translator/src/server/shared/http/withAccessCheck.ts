import type { PayloadRequest } from "payload";

import { askTheGuard } from "../access/askTheGuard.js";
import type { TranslatorAction } from "../../../types/TranslatorAction.js";
import type { AccessGuard } from "../access/types.js";
import { ServerResponse } from "./ServerResponse.js";

export function withAccessCheck(
  handler: (req: PayloadRequest) => Promise<Response>,
  access: AccessGuard,
  action: TranslatorAction
): (req: PayloadRequest) => Promise<Response> {
  return async (req) => {
    if (!(await askTheGuard(access, req, action))) return ServerResponse.forbidden();
    return handler(req);
  };
}
