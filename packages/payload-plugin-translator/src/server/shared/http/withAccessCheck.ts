import type { PayloadRequest } from "payload";

import type { AccessGuard } from "../access/types.js";
import { ServerResponse } from "./ServerResponse.js";

/** Every route is guarded; pass `AnyAccessGuard` to open one on purpose. */
export function withAccessCheck(
  handler: (req: PayloadRequest) => Promise<Response>,
  access: AccessGuard
): (req: PayloadRequest) => Promise<Response> {
  return async (req) => {
    const hasAccess = await access.check({ req });
    if (!hasAccess) return ServerResponse.forbidden();
    return handler(req);
  };
}
