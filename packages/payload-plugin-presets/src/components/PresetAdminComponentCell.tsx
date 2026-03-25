"use client";

import Image from "next/image";
import { EmptyPlaceholder, type MediaData } from "./shared/index.js";
import { useTranslation } from "@payloadcms/ui";

import "./PresetAdminComponent.scss";

interface Props {
  media: MediaData | null;
  isLoading: boolean;
}

export function PresetAdminComponentCell({ media, isLoading }: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="file">
        <div className="thumbnail thumbnail--size-small file__thumbnail preset-preview-cell__skeleton" />
      </div>
    );
  }

  const mediaUrl = media?.url;

  if (!media || !mediaUrl) {
    return <EmptyPlaceholder width={40} height={40} />;
  }

  return (
    <div className="preset-preview-cell">
      <Image
        alt={media.alt || t("presetsPlugin:blocksDrawer:preview" as never)}
        src={mediaUrl}
        width={40}
        height={40}
        className="preset-preview-cell__thumbnail"
        unoptimized
      />
    </div>
  );
}
