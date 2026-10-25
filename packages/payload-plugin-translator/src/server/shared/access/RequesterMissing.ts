import { TranslatorError } from "../../../core/errors/index.js";
import { markFailureReason } from "../../../core/domain/translation-providers/failureReason.js";

/**
 * The requester recorded on a job no longer resolves to a user. `mustPropagate` is `false` even
 * though a Payload lookup failed: `findRequester` queries outside the caller's transaction, so
 * nothing of theirs was rolled back.
 */
export class RequesterMissing extends TranslatorError {
  readonly mustPropagate = false;

  constructor(userId: unknown, userCollection: unknown) {
    super(
      markFailureReason(
        "requester-missing",
        `the requester (${String(userId)} in "${String(userCollection)}") could not be looked up`
      )
    );
  }
}
