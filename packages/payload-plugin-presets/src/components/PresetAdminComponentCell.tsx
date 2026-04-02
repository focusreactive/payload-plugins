"use client";

import Image from "next/image";
import { EmptyPlaceholder, type MediaData } from "./shared/index.js";
import { ShimmerEffect, useTranslation } from "@payloadcms/ui";

import "./PresetAdminComponent.scss";

export type PresetCellSize = "sm" | "md" | "lg";

interface PresetVariantValue {
  width: number;
  height: number;
  shimmerClass: string;
}

const SIZE_MAP: Record<PresetCellSize, PresetVariantValue> = {
  sm: {
    width: 40,
    height: 40,
    shimmerClass: "preset-shimmer--sm",
  },
  md: {
    width: 60,
    height: 60,
    shimmerClass: "preset-shimmer--md",
  },
  lg: {
    width: 400,
    height: 300,
    shimmerClass: "preset-shimmer--lg",
  },
};

interface Props {
  imageClassName?: string;
  media: MediaData | null;
  isLoading: boolean;
  size?: PresetCellSize;
}

export function PresetAdminComponentCell({
  imageClassName = "",
  media,
  isLoading,
  size = "sm",
}: Props) {
  const { t } = useTranslation();
  const { width, height, shimmerClass } = SIZE_MAP[size];

  if (isLoading) {
    return (
      <ShimmerEffect height={height} width={width} className={shimmerClass} />
    );
  }

  const mediaUrl = media?.url;

  if (!media || !mediaUrl) {
    return <EmptyPlaceholder width={width} height={height} />;
  }

  return (
    <div className={`preset-preview-cell preset-preview-cell--${size}`}>
      <Image
        className={`preset-preview-cell__thumbnail ${imageClassName}`}
        alt={media.alt || t("presetsPlugin:blocksDrawer:preview" as never)}
        src={mediaUrl}
        width={width}
        height={height}
        unoptimized
      />
    </div>
  );
}
