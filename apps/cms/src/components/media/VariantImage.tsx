"use client";

import type { ImageLoader, ImageProps } from "next/image";
import NextImage from "next/image";

import { IMAGE_QUALITY, resolveTransformWidth } from "@/lib/constants/imageDelivery.mjs";

import type { ImageVariant } from "./types";

function pathWithoutQuery(src: string): string {
  const hashIndex = src.indexOf("#");
  const withoutHash = hashIndex === -1 ? src : src.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf("?");
  return queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
}

function assetPath(src: ImageProps["src"]): string {
  if (typeof src === "string") {
    return src;
  }

  if ("src" in src && typeof src.src === "string") {
    return src.src;
  }

  if ("default" in src && typeof src.default.src === "string") {
    return src.default.src;
  }

  return "";
}

export function isSvgSrc(src: ImageProps["src"]): boolean {
  return pathWithoutQuery(assetPath(src)).toLowerCase().endsWith(".svg");
}

type VariantImageProps = ImageProps & {
  variants?: ImageVariant[];
};

export function VariantImage({
  variants,
  quality,
  priority,
  fetchPriority,
  ...props
}: VariantImageProps) {
  const resolvedFetchPriority = fetchPriority ?? (priority ? "high" : undefined);

  if (isSvgSrc(props.src)) {
    return (
      <NextImage
        {...props}
        fetchPriority={resolvedFetchPriority}
        priority={priority}
        quality={quality}
        unoptimized
      />
    );
  }

  const widest = variants?.at(-1)?.width;
  const loader: ImageLoader | undefined = variants?.length
    ? ({ src, width, quality: requestedQuality }) => {
        const target = widest ? resolveTransformWidth(width, widest) : width;
        const variant = variants.find((item) => item.width >= target);
        const url = variant?.url ?? variants.at(-1)?.url ?? src;
        const resolvedQuality = requestedQuality ?? quality ?? IMAGE_QUALITY;
        return `/_next/image?url=${encodeURIComponent(url)}&w=${target}&q=${resolvedQuality}`;
      }
    : undefined;

  return (
    <NextImage
      {...props}
      fetchPriority={resolvedFetchPriority}
      loader={loader}
      priority={priority}
      quality={quality ?? IMAGE_QUALITY}
    />
  );
}
