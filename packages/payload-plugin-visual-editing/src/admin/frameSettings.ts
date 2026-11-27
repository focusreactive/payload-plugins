import type { VeFrameSettingsMessage } from "../shared/protocol.js";

import { frameVisualEditingOf } from "../shared/frameVisualEditing.js";
import { isPlainObject } from "../shared/plainObject.js";
import {
  DATA_VISUAL_EDITING_ADMIN_ATTR,
  VE_FRAME_HELLO_TYPE,
  VE_FRAME_SETTINGS_TYPE,
} from "../shared/protocol.js";

const OPAQUE_ORIGIN = "null";

const frameOf = (doc: Document, source: MessageEventSource | null): HTMLIFrameElement | undefined =>
  [...doc.querySelectorAll("iframe")].find((frame) => frame.contentWindow === source);

const isFrameHello = (data: unknown): boolean =>
  isPlainObject(data) && data.type === VE_FRAME_HELLO_TYPE;

export function answerFrameHellos(win: Window): () => void {
  const answer = (event: MessageEvent) => {
    if (!isFrameHello(event.data) || event.origin === OPAQUE_ORIGIN) return;
    const frame = frameOf(win.document, event.source);
    if (!frame) return;
    const settings: VeFrameSettingsMessage = {
      type: VE_FRAME_SETTINGS_TYPE,
      visualEditing: frameVisualEditingOf(frame),
    };
    frame.contentWindow?.postMessage(settings, event.origin);
  };
  const root = win.document.documentElement;
  root.setAttribute(DATA_VISUAL_EDITING_ADMIN_ATTR, "");
  win.addEventListener("message", answer);
  return () => {
    root.removeAttribute(DATA_VISUAL_EDITING_ADMIN_ATTR);
    win.removeEventListener("message", answer);
  };
}
