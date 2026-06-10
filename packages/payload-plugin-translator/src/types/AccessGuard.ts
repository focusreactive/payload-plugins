import type { BasePayload, TypedUser } from "payload";

/**
 * The request context an {@link AccessGuard} receives when deciding whether to
 * allow a translation API call.
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
 * Gate for the translation API endpoints. Provide one via `translatorPlugin({ access })`
 * to control who may trigger translations; omit it to leave the endpoints open.
 *
 * @example
 * ```ts
 * const adminsOnly: AccessGuard = {
 *   check: ({ req }) => req.user?.role === 'admin',
 * }
 * translatorPlugin({ collections, translationProvider, runner, access: adminsOnly })
 * ```
 */
export interface AccessGuard {
  /**
   * Return `true` to allow the request, `false` to reject it with `403 Forbidden`.
   * May be async (e.g. to query permissions).
   */
  check<R extends AccessGuardRequest>({ req }: { req: R }): Promise<boolean> | boolean;
}
