import type { VeRenderedFields } from "../../shared/protocol.js";
import type { FieldTracker } from "../overlay/fieldTracker.js";
import type { KeepsShape } from "./liveFields.js";

import { VE_FIELDS_RENDERED_TYPE } from "../../shared/protocol.js";
import { announceToAdmin, listenToAdmin } from "./adminChannel.js";
import { adminOriginOf } from "../adminWindow.js";
import { createLiveFields } from "./liveFields.js";
import { readFieldPatches, readFieldSnapshot } from "./liveMessages.js";

export type InstantPreviewCtx = {
  adminOrigin: string;
  locale?: string;
  keepsRichTextShape?: KeepsShape;
};

export function createInstantPreview(
  tracker: FieldTracker,
  getCtx: () => InstantPreviewCtx
): () => void {
  const liveFields = createLiveFields(tracker.showText, getCtx().keepsRichTextShape);
  const adminPage = () => {
    const { adminOrigin, locale } = getCtx();
    return { adminOrigin: adminOriginOf(adminOrigin), locale };
  };

  let isAnnouncementQueued = false;
  let isStopped = false;

  const announce = (rendered: VeRenderedFields[]) =>
    announceToAdmin(VE_FIELDS_RENDERED_TYPE, rendered, adminPage());

  const announceNewFields = () => {
    isAnnouncementQueued = false;
    if (isStopped) return;
    const newFields = liveFields.takeNewlyRendered();
    if (newFields.length > 0) announce(newFields);
  };

  const queueAnnouncement = () => {
    if (isAnnouncementQueued) return;
    isAnnouncementQueued = true;
    queueMicrotask(announceNewFields);
  };

  const stopTracking = tracker.subscribe({
    onFields: (_root, matches) => {
      liveFields.track(matches);
      queueAnnouncement();
    },
    onNodesReleased: liveFields.release,
  });

  const stopListening = listenToAdmin({
    adminPage,
    announce: () => announce(liveFields.takeAllRendered()),
    onMessage: liveFields.apply,
    read: (data) => readFieldSnapshot(data) ?? readFieldPatches(data),
  });

  return () => {
    isStopped = true;
    stopListening();
    stopTracking();
  };
}
