export type DefaultMode = "panel" | "inline";

type Rect = { left: number; right: number; top: number; bottom: number };
type Point = { x: number; y: number };

export const OPEN_ICON_SIZE = 24;
const CHEVRON_SLOP = 6;

const contains = (rect: Rect, { x, y }: Point, slop = 0): boolean =>
  x >= rect.left - slop &&
  x <= rect.right + slop &&
  y >= rect.top - slop &&
  y <= rect.bottom + slop;

export const openIconRect = (actionsWrap: Rect): Rect => ({
  left: actionsWrap.left,
  right: actionsWrap.left + OPEN_ICON_SIZE,
  top: actionsWrap.top,
  bottom: actionsWrap.bottom,
});

// The whole row header is one Payload button, so where the click landed decides what it means.
export const classifyHeaderClick = ({
  chevron,
  actionsWrap,
  mode,
  point,
}: {
  chevron?: Rect | null;
  actionsWrap?: Rect | null;
  mode: DefaultMode;
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
