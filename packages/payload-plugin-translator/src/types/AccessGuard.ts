import type { BasePayload, TypedUser } from "payload";

import type { TranslatorAction } from "./TranslatorAction.js";

/**
 * The request context an {@link AccessGuard} receives when deciding whether to allow an action —
 * an API call or an admin widget render.
 */
export type AccessGuardRequest = {
  /** Incoming request headers (e.g. for token/cookie checks). */
  headers: Headers;
  /** The authenticated user, or `null`/`undefined` if the request is anonymous. */
  user?: TypedUser | null;
  /** The Payload instance, for any DB/permission lookups the guard needs. */
  payload: BasePayload;
};

/**
 * Gate for the translation API endpoints and the admin widgets. Required:
 * `translatorPlugin({ access })` throws at config time without one. To leave them open on purpose,
 * pass `new AnyAccessGuard()`.
 *
 * @since 0.14.0 required; it was optional before, and omitting it left the endpoints open.
 *
 * @example
 * ```ts
 * const adminsOnly: AccessGuard = {
 *   check: ({ req, action }) => req.user?.role === 'admin' || action === 'document-status',
 * }
 * translatorPlugin({ collections, translationProvider, runner, access: adminsOnly })
 * ```
 */
export interface AccessGuard {
  /**
   * Only `true` allows. Any other answer, or a throw, refuses: `403` from the endpoints, the widget
   * hidden in the admin.
   *
   * Called often and with nobody acting: the admin asks `"enqueue"` on every document and list
   * render, and the status actions on every poll. A call is a question — keep it free of side effects.
   */
  check<R extends AccessGuardRequest>({
    req,
    action,
  }: {
    /** Generic, so a guard keeps the request type it was handed rather than this narrowed slice. */
    req: R;
    /** @since 1.0.0 */
    action: TranslatorAction;
  }): Promise<boolean> | boolean;
}
