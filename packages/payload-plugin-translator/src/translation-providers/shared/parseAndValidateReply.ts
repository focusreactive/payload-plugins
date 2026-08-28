import type { TranslationInput, TranslationOutput } from "../../core/domain/translation-providers";
import { isObject } from "../../core/kernel/utils/isObject";
import { KeySetMismatchError, UnparseableReplyError } from "./errors";

export type ParsedReply = {
  translations: TranslationOutput;
  missingInputKeys: number[];
  unrequestedReplyKeys: string[];
};

/**
 * Parses an untrusted reply into a {@link TranslationOutput} and reports the key-set gap.
 *
 * A partial answer is applied, not rejected — the gap is returned so the caller can report it. Only
 * a reply that answers nothing is a failure ({@link KeySetMismatchError}).
 *
 * @since 0.11.0
 */
export function parseAndValidateReply(input: TranslationInput, raw: string): ParsedReply {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new UnparseableReplyError("The provider's reply was not valid JSON.", { cause });
  }

  // `isObject` admits arrays: `["a"]` has key "0", so a 0-based input would accept it by coincidence.
  if (!isObject(parsed) || Array.isArray(parsed)) {
    throw new UnparseableReplyError("The provider's reply was JSON, but not an object.");
  }

  const expectedKeys = new Set(Object.keys(input));
  const translations: TranslationOutput = {};
  const missingInputKeys: number[] = [];

  for (const key of expectedKeys) {
    const value = parsed[key];
    if (typeof value === "string") {
      translations[Number(key)] = value;
    } else {
      missingInputKeys.push(Number(key));
    }
  }

  const unrequestedReplyKeys = Object.keys(parsed).filter((key) => !expectedKeys.has(key));

  if (expectedKeys.size > 0 && Object.keys(translations).length === 0) {
    // Two different failures reach this point and they need different advice: a reply about other
    // keys entirely, and a reply about the right keys whose values are not text.
    const answeredAnyKey = [...expectedKeys].some((key) => Object.hasOwn(parsed, key));

    throw new KeySetMismatchError(
      answeredAnyKey
        ? `The provider's reply carried the requested keys, but none of the ${expectedKeys.size} values was a string.`
        : `The provider's reply answered none of the ${expectedKeys.size} requested keys.`,
      missingInputKeys,
      unrequestedReplyKeys
    );
  }

  return { translations, missingInputKeys, unrequestedReplyKeys };
}
