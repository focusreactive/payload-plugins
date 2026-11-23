import { useEffect } from "react";

import type { VeAnnounceRequestMessage } from "../../shared/protocol.js";
import type { GrantedPage } from "./previewGrants.js";
import type { PreviewSession } from "./previewSession.js";
import type { PreviewWindow } from "./usePreviewWindow.js";

import { VE_ANNOUNCE_REQUEST_TYPE, VE_PREVIEW_GRANT_REQUEST_TYPE } from "../../shared/protocol.js";
import { isPlainObject } from "../../shared/plainObject.js";

const BLANK_PAGE_URL = "about:blank";
const FRAME_LOAD_EVENT = "load";
const ANNOUNCE_REQUEST: VeAnnounceRequestMessage = { type: VE_ANNOUNCE_REQUEST_TYPE };

const isOnBlankPage = (previewWindow: Window): boolean => {
  try {
    return previewWindow.location.href === BLANK_PAGE_URL;
  } catch {
    return false;
  }
};

const grantedPageOf = (message: unknown): GrantedPage | null =>
  isPlainObject(message) && typeof message.pageId === "string"
    ? { asksForGrant: message.type === VE_PREVIEW_GRANT_REQUEST_TYPE, pageId: message.pageId }
    : null;

export function usePreviewPage(
  { getFrame, getWindow, hear, origin, post }: PreviewWindow,
  session: PreviewSession,
  onPageAnnounced: (page: GrantedPage) => void
): void {
  useEffect(() => {
    session.pageLeft();
    if (!origin) return;

    const askPageToAnnounceItself = () => {
      const previewWindow = getWindow();
      if (previewWindow && !isOnBlankPage(previewWindow)) post([ANNOUNCE_REQUEST]);
    };

    const startOverWithLoadedPage = () => {
      session.pageLeft();
      askPageToAnnounceItself();
    };

    const answerAnnouncement = (data: unknown) => {
      post(session.pageAnnounced(data));
      const page = grantedPageOf(data);
      if (page) onPageAnnounced(page);
    };

    const frame = getFrame();
    const stopHearing = hear(answerAnnouncement);
    frame?.addEventListener(FRAME_LOAD_EVENT, startOverWithLoadedPage);
    askPageToAnnounceItself();

    return () => {
      stopHearing();
      frame?.removeEventListener(FRAME_LOAD_EVENT, startOverWithLoadedPage);
    };
  }, [getFrame, getWindow, hear, onPageAnnounced, origin, post, session]);
}
