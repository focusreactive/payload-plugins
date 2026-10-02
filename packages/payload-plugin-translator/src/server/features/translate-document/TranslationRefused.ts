import { TranslatorError } from "../../../core/errors/index.js";
import { markFailureReason } from "../../../core/domain/translation-providers/failureReason.js";

/**
 * A translation the host's access rules refused.
 *
 * `toClientErrorMessage` collapses an unrecognised message to generic text outside development, so a
 * refusal built without `markFailureReason` reaches the panel looking like a provider outage.
 */
export class TranslationRefused extends TranslatorError {
  readonly mustPropagate = false;

  readonly collection: string;
  readonly targetLocale: string;

  constructor(collection: string, targetLocale: string) {
    super(
      markFailureReason(
        "permission-denied",
        `the requesting user may not write "${collection}" in locale "${targetLocale}"`
      )
    );
    this.collection = collection;
    this.targetLocale = targetLocale;
  }
}
