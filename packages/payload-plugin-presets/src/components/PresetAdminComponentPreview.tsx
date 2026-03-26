"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useField, useTranslation } from "@payloadcms/ui";
import { EmptyPlaceholder, type MediaData } from "./shared/index.js";
import { usePresetsConfig } from "./usePresetsConfig.js";

import "./PresetAdminComponent.scss";

export const PresetAdminComponentPreview: React.FC = () => {
  const { mediaCollection } = usePresetsConfig();
  const { t } = useTranslation();
  const { value } = useField<number | MediaData | null>({ path: "preview" });
  const [media, setMedia] = useState<MediaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mediaId = typeof value === "number" ? value : value?.id;

  useEffect(() => {
    if (!mediaId) {
      setIsLoading(false);
      return;
    }

    if (typeof value === "object" && value !== null) {
      setMedia(value as MediaData);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`/api/${mediaCollection}/${mediaId}`)
      .then((res) => res.json())
      .then((data) => {
        setMedia(data);
        setIsLoading(false);
      })
      .catch(() => {
        setMedia(null);
        setIsLoading(false);
      });
  }, [mediaId, value, mediaCollection]);

  if (isLoading) {
    return (
      <div className="preset-admin-preview">
        <div className="preset-admin-preview__skeleton" />
      </div>
    );
  }

  return (
    <div className="preset-admin-preview">
      {!media?.url ? (
        <EmptyPlaceholder
          style={{
            objectFit: "contain",
            maxHeight: "var(--preset-admin-preview-max-height)",
            maxWidth: "var(--preset-admin-preview-max-width)",
            width: "100%",
          }}
        />
      ) : (
        <Image
          alt={
            media.alt || t("presetsPlugin:blocksDrawer:presetPreview" as never)
          }
          src={media?.url}
          className="preset-admin-preview__image"
          width={400}
          height={300}
          unoptimized
        />
      )}
    </div>
  );
};
