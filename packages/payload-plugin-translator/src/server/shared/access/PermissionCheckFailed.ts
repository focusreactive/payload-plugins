import { TranslatorError } from "../../../core/errors/index.js";
import { markFailureReason } from "../../../core/domain/translation-providers/failureReason.js";

/**
 * A host access rule threw instead of answering. `docAccessOperation` (payload 3.84.1) calls
 * `killTransaction` from its own catch, so the caller's save is already rolled back by the time this
 * exists — hence the only `mustPropagate = true` here.
 */
export class PermissionCheckFailed extends TranslatorError {
  readonly mustPropagate = true;

  constructor(detail: string, options?: ErrorOptions) {
    super(markFailureReason("permission-check-failed", detail), options);
  }
}
