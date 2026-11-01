export const REASONS = [
  "source-unreadable",
  "model-unavailable",
  "permission-denied",
  "requester-missing",
  "permission-check-failed",
  "service-no-answer",
  "service-unreachable",
  "translation-damaged",
  "translation-incomplete",
  "translation-not-configured",
] as const;

/** A failure cause safe to name to an end user. */
export type UserFacingFailureReason = (typeof REASONS)[number];

const MARKER_PREFIX = "translator:";

const MARKER = new RegExp(`^\\[${MARKER_PREFIX}([a-z-]+)\\] `, "u");

const isUserFacingFailureReason = (value: string): value is UserFacingFailureReason =>
  (REASONS as readonly string[]).includes(value);

export function markFailureReason(reason: UserFacingFailureReason, detailForLogs: string): string {
  return `[${MARKER_PREFIX}${reason}] ${detailForLogs}`;
}

/** Anchored: a marked message quoted inside another error's text is not that error's own reason. */
export function readFailureReason(message: string): UserFacingFailureReason | null {
  const match = MARKER.exec(message);
  const reason = match?.[1];
  return reason !== undefined && isUserFacingFailureReason(reason) ? reason : null;
}
