import { TranslatorError } from "../../../core/errors/index.js";
import { TransportError } from "./TransportError.js";

/**
 * A value that is already one of ours passes through: re-wrapping would bury a specific cause under
 * a generic transport failure, and a pipeline bug would be relabelled as a provider outage.
 */
export function asTranslatorError(cause: unknown): TranslatorError {
  if (cause instanceof TranslatorError) return cause;

  return new TransportError(
    "The translation request failed before a reply could be read. The provider's own error is on this error's `cause` property.",
    { cause }
  );
}
