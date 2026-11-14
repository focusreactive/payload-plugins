import { TranslatorError } from "../../../errors/index.js";
import { markFailureReason } from "../../../errors/failureReason.js";
import type { UserFacingFailureReason } from "../../../errors/failureReason.js";
import type { TranslationFailureCode } from "../../../domain/translation-providers/index.js";

const REASON_FOR_CODE: Record<TranslationFailureCode, UserFacingFailureReason> = {
  "no-content": "service-no-answer",
  transport: "service-unreachable",
  "unparseable-reply": "translation-damaged",
  "key-set-mismatch": "translation-incomplete",
  config: "translation-not-configured",
};

export const isFailureCode = (value: unknown): value is TranslationFailureCode =>
  typeof value === "string" && Object.hasOwn(REASON_FOR_CODE, value);

/**
 * A provider's failure, named as a reason a person can act on.
 *
 * The thrown error goes on `cause`, never into `message`: a vendor SDK error can carry an API key,
 * and this message is persisted to the job record and written to the server log. `code` is kept
 * because the README states every provider failure carries one, and `onFailed` hands a host the
 * live error.
 */
export class TranslationFailed extends TranslatorError {
  readonly mustPropagate = false;
  readonly code: TranslationFailureCode;

  constructor(code: TranslationFailureCode, cause: unknown) {
    super(markFailureReason(REASON_FOR_CODE[code], "the provider's own error is on `cause`"), {
      cause,
    });
    this.code = code;
  }
}
