import type { TranslationRepository } from "../model/TranslationRepository.js";

const notImplemented = (): never => {
  throw new Error("not implemented");
};

/** The red binding: a repository with no behaviour, so every contract case must fail against it. */
export class ThrowingTranslationRepository implements TranslationRepository {
  getDocumentState = notImplemented;
  getListState = notImplemented;
  enqueue = notImplemented;
  cancel = notImplemented;
  cancelByCollection = notImplemented;
  runNow = notImplemented;
  dismissStaleness = notImplemented;
  translateField = notImplemented;
}
