import { useDocumentInfo } from "@payloadcms/ui";

/**
 * When Payload last saved the open document, in epoch milliseconds. The edit view sets it in its
 * `onSave` (`@payloadcms/ui` `views/Edit/index.js`), so a change means the document was saved.
 */
export function useDocumentSaveTime(): number {
  return useDocumentInfo().lastUpdateTime;
}
