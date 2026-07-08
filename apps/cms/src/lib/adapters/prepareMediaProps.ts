import { withVisualEditingPath } from "@fr-private/payload-plugin-visual-editing/client";

import { ImageAspectRatio } from "@/components/media/types";
import type { ImageOverrides, PreparedMedia } from "@/components/media/types";
import { getMediaUrl } from "@/lib/utils/getMediaUrl";
import type { Media } from "@/payload-types";

export interface MediaFieldData extends Partial<Omit<ImageOverrides, "aspectRatio">> {
  image?: Media | number | null;
  aspectRatio?: ImageAspectRatio | string | null;
  alt?: string;
  width?: number;
  height?: number;
  preferredSize?: keyof NonNullable<Media["sizes"]>;
}

const validRatios = Object.values(ImageAspectRatio) as string[];

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
    const src = media.url ?? (media.filename ? `/media/${media.filename}` : "");
    return {
      data: { kind: "video", src: getMediaUrl(src) },
      visualEditing,
    };
  }

  const preferredUrl = preferredSize ? media?.sizes?.[preferredSize]?.url : undefined;
  const src = preferredUrl ?? media?.url ?? "";

  const aspectRatio = resolveAspectRatio(aspectRatioProp);
  const hasConcreteAspectRatio = aspectRatio !== ImageAspectRatio.auto;

  const imageProps: ImageOverrides = {
    fit: "cover",
    sizes: "(max-width: 1280px) 100vw, 1280px",
    quality: 85,
    aspectRatio,
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
    },
    visualEditing,
    imageProps,
  };
}
