import { TranslatorError } from "../../../core/errors/index.js";

/**
 * The run record has no row for a locale the runner is translating: the row went while the queue
 * still held the work — with the document, through the `afterDelete` cascade, or by pruning.
 * `mustPropagate` is `false`: nothing had been written, so the translation is lost and no save is.
 */
export class RunRecordMissing extends TranslatorError {
  readonly mustPropagate = false;

  constructor(handle: string, targetLng: string) {
    super(
      `payload-plugin-translator: no run record for handle "${handle}" and locale "${targetLng}". ` +
        "A row with no `settledAt` names work the queue still holds; deleting it strands that work."
    );
  }
}
