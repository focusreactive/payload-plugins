import type { VeFrameHelloMessage } from "../shared/protocol.js";

import { frameVisualEditingOf } from "../shared/frameVisualEditing.js";
import { OPAQUE_ORIGIN, VE_FRAME_HELLO_TYPE, VE_FRAME_SETTINGS_TYPE } from "../shared/protocol.js";
import { adminOriginOf, hearTheAdmin, isFramedByAdmin } from "./adminWindow.js";

export const hearNothing = (): void => undefined;

const frameElementOf = (win: Window): Element | null => {
  try {
    return win.frameElement;
  } catch {
    return null;
  }
};

export const isTurnedOffByItsFrame = (win: Window): boolean => {
  const frame = frameElementOf(win);
  return frame !== null && frameVisualEditingOf(frame) === "off";
};

export function hearFrameSettings(
  win: Window,
  adminOrigin: () => string,
  onTurnedOff: (isTurnedOff: boolean) => void
): () => void {
  const askedOrigin = adminOriginOf(adminOrigin(), win);
  if (!isFramedByAdmin(win) || askedOrigin === OPAQUE_ORIGIN) return hearNothing;
  const stop = hearTheAdmin(win, adminOrigin, (message) => {
    if (message.type === VE_FRAME_SETTINGS_TYPE) onTurnedOff(message.visualEditing === "off");
  });
  const hello: VeFrameHelloMessage = { type: VE_FRAME_HELLO_TYPE };
  win.parent.postMessage(hello, askedOrigin);
  return stop;
}
