import { markFailureReason } from "../../../core/domain/translation-providers/failureReason.js";

/**
 * A translation the host's access rules refused.
 *
 * The reason goes through the failure-reason catalogue: `toClientErrorMessage` collapses an
 * unrecognised message to generic text outside development, so a bare refusal would reach the panel
 * looking like a provider outage.
 *
 * Not an `APIError` — {@link killedTheCallersTransaction} would then read it as a save already rolled
 * back, which is the opposite of what asking before writing achieves.
 */
export class TranslationRefused extends Error {
  readonly collection: string;
  readonly targetLocale: string;

  constructor(collection: string, targetLocale: string) {
    super(
      markFailureReason(
        "permission-denied",
        `the requesting user may not write "${collection}" in locale "${targetLocale}"`
      )
    );
    this.name = "TranslationRefused";
    this.collection = collection;
    this.targetLocale = targetLocale;
  }
}
