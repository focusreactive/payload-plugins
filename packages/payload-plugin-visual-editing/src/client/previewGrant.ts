import type { VePreviewGrantRequestMessage } from "../shared/protocol.js";

import { VE_PREVIEW_GRANT_REQUEST_TYPE, VE_PREVIEW_GRANT_TYPE } from "../shared/protocol.js";
import { adminOriginOf, findAdminWindow, hearTheAdmin } from "./adminWindow.js";
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

  const askAdminForGrant = () => {
    const request: VePreviewGrantRequestMessage = {
      pageId: pageLoadIdOf(window),
      type: VE_PREVIEW_GRANT_REQUEST_TYPE,
    };
    findAdminWindow(window)?.postMessage(request, adminOriginOf(adminOrigin()));
  };

  const stop = hearTheAdmin(window, adminOrigin, (message) => {
    if (message.type !== VE_PREVIEW_GRANT_TYPE) return;
    if (typeof message.grant === "string" && typeof message.expiresAt === "number") {
      held = { expiresAt: message.expiresAt, grant: message.grant };
    }
  });
  askAdminForGrant();

  return {
    current: () => (held && held.expiresAt > now() ? held.grant : null),
    stop,
  };
}
