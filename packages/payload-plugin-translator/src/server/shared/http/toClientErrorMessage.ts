import type { UserFacingFailureReason } from "../../../core/domain/translation-providers/failureReason";
import { readFailureReason } from "../../../core/domain/translation-providers/failureReason";

/** Re-authored here, never taken from the error: only text this file owns is free of vendor detail. */
const REASON_TEXT: Record<UserFacingFailureReason, string> = {
  "model-unavailable":
    "The configured translation model is not available to this API key. Set `model` in the provider configuration to one your key can use.",
  "permission-denied":
    "This translation was not written: the access rules of the target collection refuse it for the user who requested it.",
  "requester-missing":
    "This translation was not written: the user who requested it no longer exists, so there are no permissions to check it against.",
  "permission-check-failed":
    "This translation was not written: the target collection's access rules could not be evaluated. If a save triggered it, that save was rolled back — check the server logs and the collection's `access` functions.",
};

/** Call this on any message before it reaches a user — see {@link REASON_TEXT}. */
export function failureReasonText(message?: string): string | null {
  const reason = message === undefined ? null : readFailureReason(message);
  return reason === null ? null : REASON_TEXT[reason];
}

/** Shown to the browser instead of a raw provider/runtime error outside development. */
export const GENERIC_TRANSLATION_ERROR = "Translation failed. See the server logs for details.";

// Only these environments get the raw message as a debug aid. Anything else — production, an unset
// or misconfigured NODE_ENV — is treated as "not debug", so the default is the safe, generic text.
const DEBUG_ENVS = new Set(["development", "test"]);

/**
 * Collapse a server-side error message to something safe to send to the browser.
 *
 * Provider/runtime errors (e.g. `401 Incorrect API key provided: sk-proj-…`) leak implementation
 * detail — and sometimes secrets — so the client must not see them in production. The full error
 * still lives in the job record and server logs for debugging. Fail-safe: outside
 * `development`/`test` (including an unset `NODE_ENV`) the raw message never leaves this function.
 * A message carrying a failure reason is answered from this file's own catalogue instead, in every
 * environment, and its tail is never shown.
 *
 * @param message - The raw server-side error message, if any.
 * @returns The raw message in a debug environment, otherwise the generic text or a reason's copy.
 */
export function toClientErrorMessage(message?: string): string {
  const reasonText = failureReasonText(message);
  if (reasonText !== null) return reasonText;

  if (DEBUG_ENVS.has(process.env.NODE_ENV ?? "")) {
    return message?.trim() || GENERIC_TRANSLATION_ERROR;
  }
  return GENERIC_TRANSLATION_ERROR;
}
