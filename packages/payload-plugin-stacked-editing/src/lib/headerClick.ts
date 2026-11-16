export type DefaultMode = "panel" | "inline";

type Rect = { left: number; right: number; top: number; bottom: number };
type Point = { x: number; y: number };

/** Width of the "open in panel" icon drawn as the first item of `.collapsible__actions-wrap`. */
export const OPEN_ICON_SIZE = 24;
/** Extra pixels around the chevron that still count as the chevron (it is a small target). */
const CHEVRON_SLOP = 6;

const contains = (rect: Rect, { x, y }: Point, slop = 0): boolean =>
  x >= rect.left - slop &&
  x <= rect.right + slop &&
  y >= rect.top - slop &&
  y <= rect.bottom + slop;

/** The open icon is the first flex item of the actions wrap, so it starts at the wrap's left edge. */
export const openIconRect = (actionsWrap: Rect): Rect => ({
  left: actionsWrap.left,
  right: actionsWrap.left + OPEN_ICON_SIZE,
  top: actionsWrap.top,
  bottom: actionsWrap.bottom,
});

/**
 * What a click on a row header's toggle button should do. The header's whole surface is one
 * Payload button, so the target is told apart by where the click landed:
 *
 * - the chevron always toggles inline, like plain Payload;
 * - the open icon always opens the panel;
 * - anywhere else opens the panel in `panel` mode and toggles inline in `inline` mode;
 * - a keyboard activation (no pointer position) follows the mode.
 */
export const classifyHeaderClick = ({
  chevron,
  actionsWrap,
  mode,
  point,
}: {
  chevron?: Rect | null;
  actionsWrap?: Rect | null;
  mode: DefaultMode;
  /** `null` for keyboard activations (Enter/Space on the button). */
  point: Point | null;
}): "panel" | "inline" => {
  if (point) {
    if (chevron && contains(chevron, point, CHEVRON_SLOP)) {
      return "inline";
    }
    if (actionsWrap && contains(openIconRect(actionsWrap), point)) {
      return "panel";
    }
  }
  return mode === "panel" ? "panel" : "inline";
};
