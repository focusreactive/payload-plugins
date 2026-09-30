import { withVisualEditingPath } from "@fr-private/payload-plugin-visual-editing/client";

import { ImageAspectRatio } from "@/components/media/types";
import type { ImageOverrides, PreparedMedia } from "@/components/media/types";
import { IMAGE_QUALITY } from "@/lib/constants/imageDelivery.mjs";
import { absoluteMediaUrl, isAbsoluteMediaUrl, toDeliveryUrl } from "@/lib/utils/getMediaUrl";
import type { Media } from "@/payload-types";

import { collectImageVariants } from "./collectImageVariants";

export interface MediaFieldData extends Partial<Omit<ImageOverrides, "aspectRatio">> {
  image?: Media | number | null;
  aspectRatio?: ImageAspectRatio | string | null;
  alt?: string;
  width?: number;
  height?: number;
  preferredSize?: keyof NonNullable<Media["sizes"]>;
}

const validRatios = Object.values(ImageAspectRatio) as string[];

function resolveVideoUrl(media: Media): string {
  if (media.url && isAbsoluteMediaUrl(media.url)) {
    return absoluteMediaUrl(media.url, media.filesize);
  }

  const blobBase = process.env.BLOB_PUBLIC_BASE_URL?.replace(/\/+$/u, "");
  if (blobBase && media.filename) {
    return absoluteMediaUrl(`${blobBase}/${encodeURI(media.filename)}`, media.filesize);
  }

  const src = media.url ?? (media.filename ? `/media/${media.filename}` : "");
  return absoluteMediaUrl(src, media.filesize);
}

function resolveAspectRatio(raw: ImageAspectRatio | string | null | undefined): ImageAspectRatio {
  return validRatios.includes(raw ?? "") ? (raw as ImageAspectRatio) : ImageAspectRatio.auto;
}

export function prepareMediaProps(data: MediaFieldData | null | undefined): PreparedMedia {
  const {
    image,
    aspectRatio: aspectRatioProp,
    alt: altOverride,
    width: widthOverride,
    height: heightOverride,
    preferredSize,
    ...imageAttributes
  } = data ?? {};

  const visualEditing = withVisualEditingPath(image);
  const media = image && typeof image === "object" ? image : null;
  const isVideo = Boolean(media?.mimeType?.includes("video"));

  if (isVideo && media) {
    return {
      data: { kind: "video", src: resolveVideoUrl(media) },
      visualEditing,
    };
  }

  const preferredUrl = preferredSize ? media?.sizes?.[preferredSize]?.url : undefined;
  const rawSrc = preferredUrl ?? media?.url ?? "";
  const src = toDeliveryUrl(rawSrc, media?.filesize);

  const aspectRatio = resolveAspectRatio(aspectRatioProp);
  const hasConcreteAspectRatio = aspectRatio !== ImageAspectRatio.auto;
  const focalStyle =
    typeof media?.focalX === "number" && typeof media?.focalY === "number"
      ? { objectPosition: `${media.focalX}% ${media.focalY}%` }
      : undefined;

  const imageProps: ImageOverrides = {
    fit: "cover",
    sizes: "(max-width: 1280px) 100vw, 1280px",
    quality: IMAGE_QUALITY,
    aspectRatio,
    ...(focalStyle ? { style: focalStyle } : {}),
    ...(hasConcreteAspectRatio ? { fill: true } : {}),
    ...(imageAttributes as ImageOverrides),
  };

  return {
    data: {
      kind: "image",
      src,
      alt: altOverride ?? media?.alt ?? "",
      width: widthOverride ?? media?.width ?? undefined,
      height: heightOverride ?? media?.height ?? undefined,
      variants: media ? collectImageVariants(media, preferredSize) : undefined,
    },
    visualEditing,
    imageProps,
  };
}
