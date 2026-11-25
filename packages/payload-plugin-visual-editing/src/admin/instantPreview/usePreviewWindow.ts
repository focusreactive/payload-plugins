import type { LivePreviewURLType } from "payload";

import { useLivePreviewContext } from "@payloadcms/ui";
import { useCallback } from "react";

import { isMessageFrom } from "../../shared/messageSource.js";

export type PreviewWindow = {
  getFrame: () => HTMLIFrameElement | null;
  getWindow: () => Window | null;
  origin: string | null;
  post: (messages: readonly unknown[]) => void;
  hear: (onMessage: (data: unknown) => void) => () => void;
};

const hearNothing = () => undefined;

const originOf = (url: LivePreviewURLType) => {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

export function usePreviewWindow(): PreviewWindow {
  const { iframeRef, isLivePreviewing, popupRef, previewWindowType, url } = useLivePreviewContext();
  const isPopup = previewWindowType === "popup";
  const origin = originOf(url);

  const getFrame = useCallback(
    () => (isLivePreviewing && !isPopup ? iframeRef.current : null),
    [iframeRef, isLivePreviewing, isPopup]
  );

  const getWindow = useCallback(() => {
    if (!isLivePreviewing) return null;
    const openWindow = isPopup ? popupRef?.current : iframeRef.current?.contentWindow;
    return openWindow ?? null;
  }, [iframeRef, isLivePreviewing, isPopup, popupRef]);

  const post = useCallback(
    (messages: readonly unknown[]) => {
      const previewWindow = getWindow();
      if (!previewWindow || !origin) return;
      for (const message of messages) previewWindow.postMessage(message, origin);
    },
    [getWindow, origin]
  );

  const hear = useCallback(
    (onMessage: (data: unknown) => void) => {
      if (!origin) return hearNothing;
      const hearPreviewPage = (event: MessageEvent) => {
        if (isMessageFrom(event, origin, getWindow())) onMessage(event.data);
      };
      window.addEventListener("message", hearPreviewPage);
      return () => window.removeEventListener("message", hearPreviewPage);
    },
    [getWindow, origin]
  );

  return { getFrame, getWindow, hear, origin, post };
}
