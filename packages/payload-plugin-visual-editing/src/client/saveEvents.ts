import { isMessageFrom } from "../shared/messageSource.js";
import { isPlainObject } from "../shared/plainObject.js";
import { VE_DOCUMENT_SAVED_TYPE } from "../shared/protocol.js";
import { findAdminWindow } from "./adminWindow.js";

export function listenToSaves(adminOrigin: () => string, onSaved: () => void): () => void {
  const handleAdminMessage = (event: MessageEvent) => {
    if (!isMessageFrom(event, adminOrigin(), findAdminWindow(window))) return;
    if (isPlainObject(event.data) && event.data.type === VE_DOCUMENT_SAVED_TYPE) onSaved();
  };
  window.addEventListener("message", handleAdminMessage);
  return () => window.removeEventListener("message", handleAdminMessage);
}
