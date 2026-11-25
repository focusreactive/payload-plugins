import type { TranslationRepository } from "../model/TranslationRepository.js";

const notImplemented = (): never => {
  throw new Error("not implemented");
};

export class ThrowingTranslationRepository implements TranslationRepository {
  getDocumentState = notImplemented;
  getListState = notImplemented;
  enqueueDocument = notImplemented;
  enqueueList = notImplemented;
  cancel = notImplemented;
  cancelByCollection = notImplemented;
  runNow = notImplemented;
  dismissStaleness = notImplemented;
  translateField = notImplemented;
}
