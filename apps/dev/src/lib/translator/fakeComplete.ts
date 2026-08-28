import type { CompletionFn } from "@focus-reactive/payload-plugin-translator";

/**
 * A stand-in for a translation service: reverses every value, reaches no network, needs no API key.
 *
 * Reversal is by code point, not by UTF-16 unit — the integration suite asserts against
 * `[...s].reverse().join("")`, and the two disagree on anything outside the basic plane.
 */
export const reverseComplete: CompletionFn = ({ userContent }) => {
  const input = JSON.parse(userContent) as Record<string, string>;
  const reversed: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    // Blank values pass through: a translated document should keep its empty fields empty rather
    // than filling them with transformed whitespace.
    reversed[key] = value.trim() ? [...value].reverse().join("") : value;
  }

  return Promise.resolve(JSON.stringify(reversed));
};

/** A stand-in that always fails, for exercising the onFailed lifecycle callback. */
export const failingComplete: CompletionFn = () => {
  throw new Error("forced translation failure (TRANSLATOR_DRY_RUN=fail)");
};
