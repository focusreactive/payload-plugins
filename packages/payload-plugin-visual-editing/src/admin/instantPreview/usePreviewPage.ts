import { useEffect } from "react";

import type { VeAnnounceRequestMessage } from "../../shared/protocol.js";
import type { PreviewSession } from "./previewSession.js";
import type { PreviewWindow } from "./usePreviewWindow.js";

import { VE_ANNOUNCE_REQUEST_TYPE } from "../../shared/protocol.js";
import { isMessageFrom } from "../../shared/messageSource.js";

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

export function usePreviewPage(
  { getFrame, getWindow, origin, post }: PreviewWindow,
  session: PreviewSession
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

    const answerAnnouncement = (event: MessageEvent) => {
      if (isMessageFrom(event, origin, getWindow())) post(session.pageAnnounced(event.data));
    };

    const frame = getFrame();
    window.addEventListener("message", answerAnnouncement);
    frame?.addEventListener(FRAME_LOAD_EVENT, startOverWithLoadedPage);
    askPageToAnnounceItself();

    return () => {
      window.removeEventListener("message", answerAnnouncement);
      frame?.removeEventListener(FRAME_LOAD_EVENT, startOverWithLoadedPage);
    };
  }, [getFrame, getWindow, origin, post, session]);
}
