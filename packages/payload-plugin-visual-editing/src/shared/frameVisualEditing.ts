import type { FrameVisualEditing } from "./protocol.js";

import { DATA_VISUAL_EDITING_ATTR, LIVE_PREVIEW_FRAME_ID } from "./protocol.js";

const isFrameVisualEditing = (value: string | null): value is FrameVisualEditing =>
  value === "on" || value === "off";

export const frameVisualEditingOf = (frame: Element): FrameVisualEditing => {
  const asked = frame.getAttribute(DATA_VISUAL_EDITING_ATTR);
  if (isFrameVisualEditing(asked)) return asked;
  return frame.id === LIVE_PREVIEW_FRAME_ID ? "on" : "off";
};
