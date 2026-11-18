"use client";

import { useThumbnail } from "../hooks/useThumbnail.js";
import type { PreviewMedia } from "../lib/preview.js";

const BASE = "stacked-editing-card";

const ICON_PATH = {
  blocks: "M2.5 3.5h4.5v4.5H2.5zM9 3.5h4.5v4.5H9zM2.5 10h4.5v2.5H2.5zM9 10h4.5v2.5H9z",
  array: "M3 4.5h10M3 8h10M3 11.5h10",
} as const;

export const CardThumbnail = ({
  fallbackImage,
  kind,
  media,
}: {
  fallbackImage?: string | undefined;
  kind: "blocks" | "array";
  media: PreviewMedia | undefined;
}) => {
  const url = useThumbnail(media);
  if (url === undefined) {
    return <span aria-hidden className={`${BASE}__thumb ${BASE}__thumb--loading`} />;
  }
  const src = url ?? fallbackImage;
  if (src) {
    return (
      <span aria-hidden className={`${BASE}__thumb`}>
        {/* oxlint-disable-next-line next/no-img-element -- a 34px admin thumbnail, next/image adds nothing */}
        <img alt="" className={`${BASE}__image`} loading="lazy" src={src} />
      </span>
    );
  }
  return (
    <span aria-hidden className={`${BASE}__thumb ${BASE}__thumb--icon`}>
      <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
        <path
          d={ICON_PATH[kind]}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.3"
        />
      </svg>
    </span>
  );
};
