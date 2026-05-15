import type { RefObject } from "react";

export function measureLineRects(contentRef: RefObject<HTMLElement | null>) {
  const el = contentRef.current;
  if (!el) {return [];}

  const delEl = el.querySelector("del") ?? el;

  const range = document.createRange();
  range.selectNodeContents(delEl);
  const rawRects = [...range.getClientRects()];

  const groups = new Map<number, DOMRect[]>();
  for (const rect of rawRects) {
    const key = Math.round(rect.top);
    const group = groups.get(key);

    if (group) {
      group.push(rect);
    } else {
      groups.set(key, [rect]);
    }
  }

  return [...groups.values()].map((rects) => {
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));

    return new DOMRect(left, top, right - left, bottom - top);
  });
}
