import type { PlainObject } from "../shared/plainObject.js";
import type { VeLiveDocument } from "../shared/protocol.js";

import { VE_DOCUMENT_SAVED_TYPE } from "../shared/protocol.js";
import { isVeDocument, veDocumentOf } from "../shared/veDocument.js";
import { hearTheAdmin } from "./adminWindow.js";

export type SavedDocument = VeLiveDocument | null;

const savedDocumentOf = (message: PlainObject): SavedDocument => {
  if (!isVeDocument(message)) return null;
  const { locale } = message;
  return { ...veDocumentOf(message), ...(typeof locale === "string" && { locale }) };
};

export function listenToSaves(
  adminOrigin: () => string,
  onSaved: (saved: SavedDocument) => void,
  win: Window = window
): () => void {
  return hearTheAdmin(win, adminOrigin, (message) => {
    if (message.type === VE_DOCUMENT_SAVED_TYPE) onSaved(savedDocumentOf(message));
  });
}
