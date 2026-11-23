const ZOOM_PROPERTY = "currentCSSZoom";

export const zoomEveryElement = (zoom: number): void => {
  Object.defineProperty(Element.prototype, ZOOM_PROPERTY, { configurable: true, get: () => zoom });
};

export const zoomNoElement = (): void => {
  Reflect.deleteProperty(Element.prototype, ZOOM_PROPERTY);
};
