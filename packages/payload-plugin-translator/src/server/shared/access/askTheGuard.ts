import type { TranslatorAction } from "../../../types/TranslatorAction.js";
import type { AccessGuard, AccessGuardRequest } from "./types.js";

/**
 * A framework's non-local return, not a failure: Next marks `redirect()` and `notFound()` with a
 * `digest`, and the admin widgets run inside its renderer, so catching one would strand the
 * navigation the host asked for.
 */
function isNavigationSignal(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error;
}

/**
 * The only place a host guard's answer is read; call `check` through here, never directly.
 * Only a literal `true` allows; a guard that throws is logged and refuses.
 */
export async function askTheGuard(
  access: AccessGuard,
  req: AccessGuardRequest,
  action: TranslatorAction
): Promise<boolean> {
  try {
    return (await access.check({ req, action })) === true;
  } catch (error) {
    if (isNavigationSignal(error)) throw error;
    console.error("[TranslateKit] Access guard threw; refusing the request:", error);
    return false;
  }
}
