import type { FrameVisualEditing } from "./protocol.js";

import {
  DATA_VISUAL_EDITING_ADMIN_ATTR,
  DATA_VISUAL_EDITING_ATTR,
  LIVE_PREVIEW_FRAME_ID,
} from "./protocol.js";

const isFrameVisualEditing = (value: string | null): value is FrameVisualEditing =>
  value === "on" || value === "off";

const isFrameOfTheAdmin = (frame: Element): boolean =>
  frame.ownerDocument.documentElement.hasAttribute(DATA_VISUAL_EDITING_ADMIN_ATTR);

export const frameVisualEditingOf = (frame: Element): FrameVisualEditing => {
  const asked = frame.getAttribute(DATA_VISUAL_EDITING_ATTR);
  if (isFrameVisualEditing(asked)) return asked;
  if (!isFrameOfTheAdmin(frame)) return "on";
  return frame.id === LIVE_PREVIEW_FRAME_ID ? "on" : "off";
};
