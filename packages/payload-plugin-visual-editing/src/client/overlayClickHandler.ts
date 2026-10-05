import type { VeIdentity } from "../internal/shared.js";

import { VE_MESSAGE_TYPE } from "../constants.js";
import type { VeOpenFieldMessage } from "../constants.js";
import { spreadVeIdentity } from "../internal/shared.js";

export type OverlayClickContext = VeIdentity & {
  href: string;
  adminOrigin: string;
  locale?: string;
};

export const buildOverlayClickHandler =
  (ctx: OverlayClickContext, win: Window = window) =>
  (event: MouseEvent) => {
    event.preventDefault?.();

    const message: VeOpenFieldMessage = {
      type: VE_MESSAGE_TYPE,
      ...spreadVeIdentity(ctx),
      ...(ctx.locale !== undefined && { locale: ctx.locale }),
    };

    if (win.parent && win.parent !== win) {
      win.parent.postMessage(message, ctx.adminOrigin || "*");
      return;
    }

    const opener = win.opener as Window | null;
    if (opener && !opener.closed) {
      opener.postMessage(message, ctx.adminOrigin || "*");
      return;
    }

    win.open(ctx.href, "_blank");
  };
