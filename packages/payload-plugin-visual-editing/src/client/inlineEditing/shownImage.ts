import type { VePickedMedia, VeShownMedia } from "../../shared/protocol.js";

export type ImageSize = { width: number };

export type BuildImageUrl = (media: VePickedMedia, size?: ImageSize) => string | undefined;

const SOURCE_ATTR = "src";
const VARIANTS_ATTR = "srcset";
const VARIANT_SIZES_ATTR = "sizes";
const SOURCES_OF_PICTURE = "source";
const PICTURE = "picture";
const WIDTH_ATTR = "width";
const DESCRIPTION_ATTR = "alt";
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

const SHOWN_BY_IMAGE = [SOURCE_ATTR, VARIANTS_ATTR, VARIANT_SIZES_ATTR, HEIGHT_ATTR];
const SHOWN_BY_SOURCE = [VARIANTS_ATTR, VARIANT_SIZES_ATTR];

const rememberedAttrsOf = (element: Element, attrs: readonly string[]): (() => void) => {
  const remembered = attrs.map((attr) => [attr, element.getAttribute(attr)] as const);
  return () => {
    for (const [attr, value] of remembered) {
      if (value === null) element.removeAttribute(attr);
      else element.setAttribute(attr, value);
    }
  };
};

export const showMedia = (
  image: HTMLImageElement,
  media: VePickedMedia,
  url: string,
  isDescribedByTheField = false
): (() => void) => {
  const description = isDescribedByTheField ? (media.alt ?? "") : undefined;
  const putBack = [
    rememberedAttrsOf(image, [
      ...SHOWN_BY_IMAGE,
      ...(description === undefined ? [] : [DESCRIPTION_ATTR]),
    ]),
    ...sourcesAround(image).map((source) => rememberedAttrsOf(source, SHOWN_BY_SOURCE)),
  ];
  for (const source of sourcesAround(image)) {
    source.setAttribute(VARIANTS_ATTR, url);
    source.removeAttribute(VARIANT_SIZES_ATTR);
  }
  image.removeAttribute(VARIANTS_ATTR);
  image.removeAttribute(VARIANT_SIZES_ATTR);
  image.setAttribute(SOURCE_ATTR, url);
  if (description !== undefined) image.setAttribute(DESCRIPTION_ATTR, description);
  keepWidthWithProportionsOf(image, media);
  return () => {
    for (const putBackOne of putBack) putBackOne();
  };
};
