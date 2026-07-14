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
 * still lives in the job record and server logs for debugging; only the client-facing copy is
 * collapsed. Fail-safe: the raw message passes through solely in `development`/`test`; every other
 * environment (including an unset `NODE_ENV`) returns {@link GENERIC_TRANSLATION_ERROR}.
 *
 * @param message - The raw server-side error message, if any.
 * @returns The raw message in a debug environment, otherwise the generic text.
 */
export function toClientErrorMessage(message?: string): string {
  if (DEBUG_ENVS.has(process.env.NODE_ENV ?? "")) {
    return message?.trim() || GENERIC_TRANSLATION_ERROR;
  }
  return GENERIC_TRANSLATION_ERROR;
}
