import { TranslatorError } from "../../../core/errors/index.js";
import { markFailureReason } from "../../../core/domain/translation-providers/failureReason.js";

/**
 * A host access rule threw instead of answering. `docAccessOperation` calls `killTransaction` from
 * its own catch (payload 3.90.1, `collections/operations/docAccess.js:41`), so the caller's save is
 * already rolled back by the time this exists — hence `mustPropagate = true`.
 */
export class PermissionCheckFailed extends TranslatorError {
  readonly mustPropagate = true;

  constructor(detail: string, options?: ErrorOptions) {
    super(markFailureReason("permission-check-failed", detail), options);
  }
}
