import type { VeLiveDocument } from "../shared/protocol.js";

import { isMessageFrom } from "../shared/messageSource.js";
import { isPlainObject } from "../shared/plainObject.js";
import { VE_DOCUMENT_SAVED_TYPE } from "../shared/protocol.js";
import { isVeDocument, veDocumentOf } from "../shared/veDocument.js";
import { findAdminWindow } from "./adminWindow.js";

export type SavedDocument = VeLiveDocument | null;

const savedDocumentOf = (message: Record<string, unknown>): SavedDocument => {
  if (!isVeDocument(message)) return null;
  const { locale } = message;
  return { ...veDocumentOf(message), ...(typeof locale === "string" && { locale }) };
};

export function listenToSaves(
  adminOrigin: () => string,
  onSaved: (saved: SavedDocument) => void
): () => void {
  const handleAdminMessage = (event: MessageEvent) => {
    if (!isMessageFrom(event, adminOrigin(), findAdminWindow(window))) return;
    if (isPlainObject(event.data) && event.data.type === VE_DOCUMENT_SAVED_TYPE) {
      onSaved(savedDocumentOf(event.data));
    }
  };
  window.addEventListener("message", handleAdminMessage);
  return () => window.removeEventListener("message", handleAdminMessage);
}
