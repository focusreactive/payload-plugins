import type { TranslationInput, TranslationOutput } from "../../core/domain/translation-providers";
import { isObject } from "../../core/kernel/utils/isObject";
import { KeySetMismatchError, UnparseableReplyError } from "./errors";

/**
 * What a reply turned into, plus what did not line up.
 *
 * @since 0.11.0
 */
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

  // `isObject` admits arrays, and an array would sometimes *look* right: `["a"]` has key "0", so an
  // input starting at index 0 would quietly accept it while an input starting anywhere else would
  // not. Reject the shape outright rather than let that coincidence decide.
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
    throw new KeySetMismatchError(
      `The provider's reply answered none of the ${expectedKeys.size} requested keys.`,
      missingInputKeys,
      unrequestedReplyKeys
    );
  }

  return { translations, missingInputKeys, unrequestedReplyKeys };
}
