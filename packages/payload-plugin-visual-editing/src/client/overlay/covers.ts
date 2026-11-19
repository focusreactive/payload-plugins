import { rectInZoomOf, zoomOf } from "./zoom.js";

export const DATA_VE_COVER_ATTR = "data-ve-cover";

type Point = { x: number; y: number };

export const measureCovers = (): ReadonlyMap<Element, DOMRect> => {
  const covers = new Map<Element, DOMRect>();
  for (const cover of document.querySelectorAll(`[${DATA_VE_COVER_ATTR}]`)) {
    const rect = cover.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) covers.set(cover, rect);
  }
  return covers;
};

const rectPath = (left: number, top: number, right: number, bottom: number, origin: Point) => {
  const x1 = left - origin.x;
  const y1 = top - origin.y;
  const x2 = right - origin.x;
  const y2 = bottom - origin.y;
  return `${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px`;
};

export const clipUnderCovers = (
  box: HTMLElement,
  target: HTMLElement,
  boxOriginInViewport: Point,
  covers: ReadonlyMap<Element, DOMRect>
): void => {
  const holes: string[] = [];
  for (const [cover, rect] of covers) {
    const isPartOfTarget = cover.contains(target) || target.contains(cover);
    if (isPartOfTarget) continue;
    const { bottom, left, right, top } = rectInZoomOf(box, rect);
    holes.push(rectPath(left, top, right, bottom, boxOriginInViewport));
  }

  if (holes.length === 0) {
    box.style.clipPath = "";
    return;
  }

  const zoom = zoomOf(box);
  const viewport = rectPath(
    0,
    0,
    window.innerWidth / zoom,
    window.innerHeight / zoom,
    boxOriginInViewport
  );
  const backToStart = `${-boxOriginInViewport.x}px ${-boxOriginInViewport.y}px`;
  box.style.clipPath = `polygon(evenodd, ${[viewport, ...holes].join(`, ${backToStart}, `)})`;
};
