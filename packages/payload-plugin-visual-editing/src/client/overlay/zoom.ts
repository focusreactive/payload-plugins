const NO_ZOOM = 1;

const isUsableZoom = (zoom: unknown): zoom is number =>
  typeof zoom === "number" && Number.isFinite(zoom) && zoom > 0;

export const zoomOf = (element: Element): number => {
  const zoom: unknown = element.currentCSSZoom;
  return isUsableZoom(zoom) ? zoom : NO_ZOOM;
};

export const rectInZoomOf = (element: Element, rect: DOMRect): DOMRect => {
  const zoom = zoomOf(element);
  if (zoom === NO_ZOOM) return rect;
  return new DOMRect(rect.x / zoom, rect.y / zoom, rect.width / zoom, rect.height / zoom);
};
