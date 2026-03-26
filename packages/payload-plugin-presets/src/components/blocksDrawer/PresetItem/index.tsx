"use client";

import { MediaData, Preset } from "../../shared";
import { useEffect, useState } from "react";
import { useTranslation } from "@payloadcms/ui";
import { usePresetsConfig } from "../../usePresetsConfig.js";
import Image from "next/image";
import { TrashIcon } from "@payloadcms/ui/icons/Trash";
import * as Popover from "@radix-ui/react-popover";

import "./styles.scss";
import { PresetAdminComponentCell } from "../../PresetAdminComponentCell";

interface Props {
  preset: Preset | null;
  mediaCollection: string;
  label?: string;
  onSelect: (preset: Preset | null) => void;
  onDeleteRequest?: (preset: Preset) => void;
}

export function PresetItem({
  preset,
  mediaCollection,
  label,
  onSelect,
  onDeleteRequest,
}: Props) {
  const { preview } = preset ?? {};

  const { t } = useTranslation();

  const [media, setMedia] = useState<MediaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const mediaId = typeof preview === "number" ? preview : preview?.id;
  const mediaUrl = media?.url;

  const handleRemoveButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsOpen(false);
    if (preset) onDeleteRequest?.(preset);
  };

  useEffect(() => {
    if (!mediaId) {
      setIsLoading(false);
      return;
    }

    if (typeof preview === "object" && preview !== null) {
      setMedia(preview);
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
  }, [mediaId, preview, mediaCollection]);

  const hasPreview = !isLoading && !!media && !!mediaUrl;

  return (
    <Popover.Root open={isOpen && hasPreview}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="popover__thumbnail-card thumbnail-card thumbnail-card--has-on-click thumbnail-card--align-label-center"
          onClick={() => onSelect(preset)}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="thumbnail-card__thumbnail">
            <PresetAdminComponentCell media={media} isLoading={isLoading} />
          </div>

          <div
            className="thumbnail-card__label"
            style={{ ...(!preset ? { fontWeight: "normal" } : null) }}
          >
            {preset
              ? preset.name
              : `${t("presetsPlugin:blocksDrawer:empty" as never)} ${label}`}
          </div>

          {preset?.name && (
            <button
              className="remove-preset"
              type="button"
              onClick={handleRemoveButtonClick}
            >
              <TrashIcon className="remove-preset__icon" />
            </button>
          )}
        </button>
      </Popover.Trigger>

      {hasPreview && (
        <Popover.Portal>
          <Popover.Content
            className="preset-item__popover-content"
            side="right"
            sideOffset={8}
            align="start"
            avoidCollisions
            collisionPadding={8}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <Image
              alt={
                media.alt || t("presetsPlugin:blocksDrawer:preview" as never)
              }
              src={mediaUrl}
              width={300}
              height={300}
              className="preset-preview-cell__popup-image"
              unoptimized
            />
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
}
