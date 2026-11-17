import { createContext } from "react";

import { isMessageFrom } from "../shared/messageSource.js";

export type PreviewPage = { origin: string; getWindow: () => Window | null };

export type AnnouncePreviewPage = (page: PreviewPage) => () => void;

const ignorePreviewPage: AnnouncePreviewPage = () => () => undefined;

export const PreviewPagesContext = createContext<AnnouncePreviewPage>(ignorePreviewPage);

export const isFromAdminOrPreviewPage = (
  event: MessageEvent,
  adminOrigin: string,
  previewPages: ReadonlySet<PreviewPage>
): boolean => {
  if (event.origin === adminOrigin) return true;
  for (const page of previewPages) {
    if (isMessageFrom(event, page.origin, page.getWindow())) return true;
  }
  return false;
};
