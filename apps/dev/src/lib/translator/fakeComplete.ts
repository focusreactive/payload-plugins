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
    reversed[key] = value.trim() ? [...value].reverse().join("") : value;
  }

  return Promise.resolve(JSON.stringify(reversed));
};

export const failingComplete: CompletionFn = () => {
  throw new Error("forced translation failure");
};
