export const DATA_VE_COVER_ATTR = "data-ve-cover";

type Point = { x: number; y: number };

/** The elements the page marked with `data-ve-cover`, such as a sticky header, measured once per pass. */
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

/**
 * Hides the part of an overlay box, and of anything it holds, that lies under a cover. A cover
 * that holds the target, or that the target holds, hides nothing: its own content stays editable.
 * `origin` is the viewport position of the box's top left corner.
 */
export const clipUnderCovers = (
  box: HTMLElement,
  target: HTMLElement,
  origin: Point,
  covers: ReadonlyMap<Element, DOMRect>
): void => {
  const holes: string[] = [];
  for (const [cover, rect] of covers) {
    if (cover.contains(target) || target.contains(cover)) continue;
    holes.push(rectPath(rect.left, rect.top, rect.right, rect.bottom, origin));
  }

  if (holes.length === 0) {
    box.style.clipPath = "";
    return;
  }

  const viewport = rectPath(0, 0, window.innerWidth, window.innerHeight, origin);
  const backToStart = `${-origin.x}px ${-origin.y}px`;
  box.style.clipPath = `polygon(evenodd, ${[viewport, ...holes].join(`, ${backToStart}, `)})`;
};
