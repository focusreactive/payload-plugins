/**
 * Payload's job queue keeps only the message: it rethrows a handler failure as
 * `new TaskError({ message: err.message })` and persists `{ name, cancelled, message, stack }`,
 * so the error's class, `code` and `cause` are gone before anything is stored (Payload 3.x).
 * That is why a reason travels inside the string rather than as an error subclass or a field.
 */

/** A failure cause safe to name to an end user. Every member obliges admin-facing copy for it. */
export type UserFacingFailureReason = "model-unavailable";

const MARKER_PREFIX = "translator:";

const MARKER = new RegExp(`^\\[${MARKER_PREFIX}([a-z-]+)\\] `, "u");

const REASONS: ReadonlySet<string> = new Set<UserFacingFailureReason>(["model-unavailable"]);

const isUserFacingFailureReason = (value: string): value is UserFacingFailureReason =>
  REASONS.has(value);

/** `detail` is for logs and the job record; it is never shown to a user. */
export function markFailureReason(reason: UserFacingFailureReason, detail: string): string {
  return `[${MARKER_PREFIX}${reason}] ${detail}`;
}

/** Anchored: a marked message quoted inside another error's text is not that error's own reason. */
export function readFailureReason(message: string): UserFacingFailureReason | null {
  const match = MARKER.exec(message);
  const reason = match?.[1];
  return reason !== undefined && isUserFacingFailureReason(reason) ? reason : null;
}
