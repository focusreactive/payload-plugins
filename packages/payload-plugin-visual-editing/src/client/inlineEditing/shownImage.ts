import type { VeShownMedia } from "../../shared/protocol.js";

const SOURCE_ATTR = "src";
const VARIANTS_ATTR = "srcset";
const VARIANT_SIZES_ATTR = "sizes";
const SOURCES_OF_PICTURE = "source";
const PICTURE = "picture";
const WIDTH_ATTR = "width";
const HEIGHT_ATTR = "height";

export const absoluteUrlOf = (url: string, payloadApi: string, win: Window = window): string => {
  try {
    const servedFrom = new URL(payloadApi, win.location.href).origin;
    return new URL(url, servedFrom).href;
  } catch {
    return url;
  }
};

const sourcesAround = (image: HTMLImageElement): HTMLSourceElement[] => {
  const picture = image.closest(PICTURE);
  return picture ? Array.from(picture.querySelectorAll(SOURCES_OF_PICTURE)) : [];
};

const sizeAttrOf = (image: HTMLImageElement, attr: string): number | null => {
  const size = Number(image.getAttribute(attr));
  return image.hasAttribute(attr) && Number.isFinite(size) && size > 0 ? size : null;
};

const keepWidthWithProportionsOf = (image: HTMLImageElement, { height, width }: VeShownMedia) => {
  const shownWidth = sizeAttrOf(image, WIDTH_ATTR);
  if (shownWidth === null || sizeAttrOf(image, HEIGHT_ATTR) === null) return;
  if (!width || !height) return;
  image.setAttribute(HEIGHT_ATTR, String(Math.round((shownWidth * height) / width)));
};

export const showMedia = (image: HTMLImageElement, media: VeShownMedia, url: string): void => {
  for (const source of sourcesAround(image)) {
    source.setAttribute(VARIANTS_ATTR, url);
    source.removeAttribute(VARIANT_SIZES_ATTR);
  }
  image.removeAttribute(VARIANTS_ATTR);
  image.removeAttribute(VARIANT_SIZES_ATTR);
  image.setAttribute(SOURCE_ATTR, url);
  keepWidthWithProportionsOf(image, media);
};
