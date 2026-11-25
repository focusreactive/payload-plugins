import type {
  VeLiveDocument,
  VeRenderedFields,
  VeRenderedMessage,
  VeRenderedType,
} from "../../shared/protocol.js";

import { findAdminWindow, hearTheAdmin } from "../adminWindow.js";
import { PAGE_SHOWN_EVENT } from "../overlay/constants.js";
import { isAnnounceRequest, isForAnotherLocale } from "./liveMessages.js";
import { pageLoadIdOf } from "./pageLoad.js";

export type AdminPage = { adminOrigin: string; locale: string | undefined };

type AdminListener<Message extends VeLiveDocument> = {
  adminPage: () => AdminPage;
  announce: () => void;
  read: (data: unknown) => Message | null;
  onMessage: (message: Message) => void;
};

export const announceToAdmin = <Type extends VeRenderedType>(
  type: Type,
  rendered: VeRenderedFields[],
  { adminOrigin, locale }: AdminPage
): void => {
  const announcement: VeRenderedMessage<Type> = {
    pageId: pageLoadIdOf(window),
    rendered,
    type,
    ...(locale !== undefined && { locale }),
  };
  findAdminWindow(window)?.postMessage(announcement, adminOrigin);
};

export function listenToAdmin<Message extends VeLiveDocument>({
  adminPage,
  announce,
  onMessage,
  read,
}: AdminListener<Message>): () => void {
  const stopHearing = hearTheAdmin(
    window,
    () => adminPage().adminOrigin,
    (data) => {
      if (isAnnounceRequest(data)) {
        announce();
        return;
      }
      const message = read(data);
      if (message && !isForAnotherLocale(message, adminPage().locale)) onMessage(message);
    }
  );

  const announceRestoredPage = (event: PageTransitionEvent) => {
    if (event.persisted) announce();
  };

  window.addEventListener(PAGE_SHOWN_EVENT, announceRestoredPage);
  announce();

  return () => {
    stopHearing();
    window.removeEventListener(PAGE_SHOWN_EVENT, announceRestoredPage);
  };
}
