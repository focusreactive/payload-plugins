import { ImageAspectRatio } from '@repo/ui/components/ui/image/types';
import type { IImageProps } from '@repo/ui/components/ui/image/types';

import type { Media } from "@/payload-types";

export interface ImageFieldData extends Partial<
  Omit<IImageProps, "aspectRatio">
> {
  image?: Media | number | null;
  aspectRatio?: ImageAspectRatio | string | null;
}

const validRatios = Object.values(ImageAspectRatio) as string[];

function resolveAspectRatio(
  raw: ImageAspectRatio | string | null | undefined
): ImageAspectRatio {
  return validRatios.includes(raw ?? "")
    ? (raw as ImageAspectRatio)
    : ImageAspectRatio["auto"];
}

export function prepareImageProps(
  data: ImageFieldData | null | undefined
): IImageProps {
  const {
    image: media,
    aspectRatio: aspectRatioProp,
    ...imageAttributes
  } = data ?? {};

  const aspectRatio = resolveAspectRatio(aspectRatioProp);

  if (!media || typeof media !== "object") {
    return {
      alt: "",
      aspectRatio,
      fill: true,
      fit: "cover",
      src: "",
      ...imageAttributes,
    };
  }

  return {
    alt: media.alt ?? "",
    aspectRatio,
    fill: true,
    fit: "cover",
    sizes: "(max-width: 1280px) 100vw, 1280px",
    src: media.url ?? "",
    ...imageAttributes,
  };
}
