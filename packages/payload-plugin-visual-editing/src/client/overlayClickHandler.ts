import type { VeIdentity } from "../shared/shared.js";

import { VE_MESSAGE_TYPE } from "../shared/protocol.js";
import type { VeOpenFieldMessage } from "../shared/protocol.js";
import { veIdentityOf } from "../shared/shared.js";
import { findAdminWindow } from "./adminWindow.js";

export type OverlayClickContext = VeIdentity & {
  href: string;
  adminOrigin: string;
  locale?: string;
};

const adminUrlOf = ({ adminOrigin, href }: OverlayClickContext): string =>
  adminOrigin ? new URL(href, adminOrigin).href : href;

export const buildOverlayClickHandler =
  (ctx: OverlayClickContext, win: Window = window) =>
  (event: MouseEvent) => {
    event.preventDefault?.();

    const message: VeOpenFieldMessage = {
      type: VE_MESSAGE_TYPE,
      ...veIdentityOf(ctx),
    };

    const adminWindow = findAdminWindow(win);
    if (adminWindow) {
      adminWindow.postMessage(message, ctx.adminOrigin || win.location.origin);
      return;
    }

    win.open(adminUrlOf(ctx), "_blank");
  };
