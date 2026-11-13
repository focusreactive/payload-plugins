import React from "react";

import type { Media } from "@/payload-types";

type MediaValue = number | Media | null | undefined;

export function mediaOf(value: MediaValue): Media | null {
  return value && typeof value === "object" ? value : null;
}

export function mediaUrl(value: MediaValue): string | undefined {
  return mediaOf(value)?.url ?? undefined;
}

interface Props {
  media: MediaValue;
  /** Overrides the image's own alternative text. */
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
}

/**
 * A plain `img`, because the site's stylesheet sizes images by their own selectors and a wrapper
 * element or generated class would break those rules.
 */
export function SiteImage({ media, alt, className, width, height, eager = false }: Props) {
  const image = mediaOf(media);

  if (!image?.url) {
    return null;
  }

  return (
    <img
      alt={alt ?? image.alt ?? ""}
      className={className}
      decoding="async"
      height={height ?? image.height ?? undefined}
      loading={eager ? "eager" : "lazy"}
      src={image.url}
      width={width ?? image.width ?? undefined}
    />
  );
}

/** A `div.bg-container` with the image as its background, as the site's own markup does. */
export function SiteBackground({
  media,
  className = "bg-container",
}: Pick<Props, "media" | "className">) {
  const url = mediaUrl(media);

  return (
    <div className={className} style={url ? { backgroundImage: `url("${url}")` } : undefined} />
  );
}
