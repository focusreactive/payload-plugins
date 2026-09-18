import { markFailureReason } from "../../../core/domain/translation-providers/failureReason";

/**
 * A translation the host's own access rules refused.
 *
 * Carries its reason through the failure-reason catalogue rather than as a plain message, because
 * `toClientErrorMessage` collapses anything it does not recognise to generic text outside
 * development — so a bare refusal would reach the panel as "Translation failed. See the server logs
 * for details.", indistinguishable from a provider outage. A catalogued reason is answered from the
 * plugin's own copy in every environment.
 *
 * Not an `APIError`: this never travels through a Payload operation, and typing it as one would make
 * `killedTheCallersTransaction` treat it as a failure that already rolled the caller's save back,
 * which is the opposite of what asking-before-writing achieves.
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
