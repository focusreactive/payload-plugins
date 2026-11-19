import { FRAME_ACTIVE_BORDER, FRAME_ACTIVE_WIDTH, FRAME_RADIUS } from "../overlay/constants.js";
import { placeFrame } from "../overlay/frameLayer.js";
import { areaOf } from "../overlay/targetArea.js";

export const DATA_VE_EDITING_FRAME_ATTR = "data-ve-editing-frame";

const FRAME_Z_INDEX = "2147483646";
const IN_CAPTURE_PHASE = true;

export const showEditingFrame = (edited: HTMLElement): (() => void) => {
  const doc = edited.ownerDocument;
  const win = doc.defaultView ?? window;
  const frame = doc.createElement("div");
  frame.setAttribute(DATA_VE_EDITING_FRAME_ATTR, "");
  Object.assign(frame.style, {
    border: FRAME_ACTIVE_BORDER,
    borderRadius: FRAME_RADIUS,
    boxSizing: "border-box",
    left: "0",
    pointerEvents: "none",
    position: "fixed",
    top: "0",
    zIndex: FRAME_Z_INDEX,
  } as Partial<CSSStyleDeclaration>);

  const place = () => {
    placeFrame(frame, edited, FRAME_ACTIVE_WIDTH);
  };
  const resizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
  resizes?.observe(areaOf(edited));
  win.addEventListener("scroll", place, { capture: IN_CAPTURE_PHASE, passive: true });
  win.addEventListener("resize", place, { passive: true });
  edited.addEventListener("input", place);
  doc.body.append(frame);
  place();

  return () => {
    resizes?.disconnect();
    win.removeEventListener("scroll", place, IN_CAPTURE_PHASE);
    win.removeEventListener("resize", place);
    edited.removeEventListener("input", place);
    frame.remove();
  };
};
