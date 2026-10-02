import { TranslatorError } from "../../../core/errors/index.js";
import { markFailureReason } from "../../../core/domain/translation-providers/failureReason.js";

/**
 * Refused by the collection's `read` rule, or absent — deliberately the same answer, so a reply
 * cannot be used to probe for documents.
 */
export class SourceUnreadable extends TranslatorError {
  readonly mustPropagate = false;

  constructor(collection: string, locale: string) {
    super(
      markFailureReason(
        "source-unreadable",
        `"${collection}" in locale "${locale}" is not readable by the requesting user`
      )
    );
  }
}
