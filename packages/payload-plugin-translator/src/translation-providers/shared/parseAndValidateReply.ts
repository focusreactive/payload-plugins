import type { TranslationInput, TranslationOutput } from "../../core/domain/translation-providers";
import { isObject } from "../../core/kernel/utils/isObject";
import { KeySetMismatchError, UnparseableReplyError } from "./errors";

/**
 * What a reply turned into, plus what did not line up.
 *
 * @since 0.11.0
 */
export type ParsedReply = {
  /** Only the entries whose keys were asked for. */
  translations: TranslationOutput;
  /** Input keys the reply did not answer. */
  missing: number[];
  /** Keys the reply invented. */
  unexpected: string[];
};

/**
 * Parses an untrusted reply into a trusted {@link TranslationOutput} and reports the key-set gap.
 *
 * This is the one place a model's output crosses from "some text a service returned" into data this
 * package will write to a document, so it is where the reply is checked rather than trusted.
 *
 * A *partial* answer is applied, not rejected: dropping good translations because one field is
 * missing helps nobody. The gap is returned so the caller can say so out loud. Only a reply that
 * answers nothing at all is a failure, because that is indistinguishable from the model having
 * ignored the request.
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

  const expected = Object.keys(input);
  const translations: TranslationOutput = {};
  const missing: number[] = [];

  for (const key of expected) {
    const value = parsed[key];
    if (typeof value === "string") {
      translations[Number(key)] = value;
    } else {
      missing.push(Number(key));
    }
  }

  // `Object.hasOwn`, not `key in input`: `in` walks the prototype chain, so a reply inventing keys
  // named after Object.prototype members ("toString", "constructor") would be counted as expected and
  // silently vanish from the report.
  const unexpected = Object.keys(parsed).filter((key) => !Object.hasOwn(input, key));

  if (expected.length > 0 && Object.keys(translations).length === 0) {
    throw new KeySetMismatchError(
      `The provider's reply answered none of the ${expected.length} requested keys.`,
      missing,
      unexpected
    );
  }

  return { translations, missing, unexpected };
}
