"use client";

import { MediaData, Preset } from "../../shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@payloadcms/ui";
import { usePresetsConfig } from "../../usePresetsConfig.js";
import Image from "next/image";
import { TrashIcon } from "@payloadcms/ui/icons/Trash";
import { EditIcon } from "@payloadcms/ui/icons/Edit";
import * as Popover from "@radix-ui/react-popover";

import "./styles.scss";
import { PresetAdminComponentCell } from "../../PresetAdminComponentCell";

interface Props {
  preset: Preset | null;
  mediaCollection: string;
  label?: string;
  onSelect: (preset: Preset | null) => void;
  onDeleteRequest?: (preset: Preset) => void;
  tabIndex?: number;
  onFocus?: () => void;
}

export function PresetItem({
  preset,
  mediaCollection,
  label,
  onSelect,
  onDeleteRequest,
  tabIndex,
  onFocus,
}: Props) {
  const { preview } = preset ?? {};

  const { t } = useTranslation();
  const { slug } = usePresetsConfig();

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

  const handleButtonFocus = () => {
    setIsOpen(true);
    onFocus?.();
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
          className="preset-item"
          onClick={() => onSelect(preset)}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onFocus={handleButtonFocus}
          onBlur={() => setIsOpen(false)}
          tabIndex={tabIndex}
        >
          <div className="preset-item__thumbnail">
            <PresetAdminComponentCell
              media={media}
              isLoading={isLoading}
              size="md"
            />
          </div>

          <div className="preset-item__content">
            <div className="preset-item__label">
              {preset
                ? preset.name
                : `${t("presetsPlugin:blocksDrawer:empty" as never)} ${label}`}
            </div>

            <div className="preset-item__actions">
              {preset?.id && (
                <a
                  className="preset-action edit-preset"
                  href={`/admin/collections/${slug}/${preset.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <EditIcon className="edit-preset__icon" />
                </a>
              )}
              {preset?.name && (
                <button
                  className="preset-action remove-preset"
                  type="button"
                  onClick={handleRemoveButtonClick}
                >
                  <TrashIcon className="remove-preset__icon" />
                </button>
              )}
            </div>
          </div>
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
          >
            <PresetAdminComponentCell
              imageClassName="preset-preview-cell__popup-image"
              media={media}
              isLoading={false}
              size="lg"
            />
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
}
