import { isMessageFrom } from "../shared/messageSource.js";
import { isPlainObject } from "../shared/plainObject.js";
import type { VePreviewGrantRequestMessage } from "../shared/protocol.js";

import { VE_PREVIEW_GRANT_REQUEST_TYPE, VE_PREVIEW_GRANT_TYPE } from "../shared/protocol.js";
import { adminOriginOf, findAdminWindow } from "./adminWindow.js";
import { pageLoadIdOf } from "./instantPreview/pageLoad.js";

export interface PreviewGrantListener {
  current(): string | null;
  stop(): void;
}

export function listenToPreviewGrants(
  adminOrigin: () => string,
  now: () => number = Date.now
): PreviewGrantListener {
  let held: { expiresAt: number; grant: string } | null = null;

  const handleAdminMessage = (event: MessageEvent) => {
    if (!isMessageFrom(event, adminOrigin(), findAdminWindow(window))) return;
    const { data } = event;
    if (!isPlainObject(data) || data.type !== VE_PREVIEW_GRANT_TYPE) return;
    if (typeof data.grant === "string" && typeof data.expiresAt === "number") {
      held = { expiresAt: data.expiresAt, grant: data.grant };
    }
  };
  const askAdminForGrant = () => {
    const request: VePreviewGrantRequestMessage = {
      pageId: pageLoadIdOf(window),
      type: VE_PREVIEW_GRANT_REQUEST_TYPE,
    };
    findAdminWindow(window)?.postMessage(request, adminOriginOf(adminOrigin()));
  };

  window.addEventListener("message", handleAdminMessage);
  askAdminForGrant();

  return {
    current: () => (held && held.expiresAt > now() ? held.grant : null),
    stop: () => window.removeEventListener("message", handleAdminMessage),
  };
}
