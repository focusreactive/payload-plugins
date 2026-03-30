"use client";

import { MediaData, Preset } from "../../shared";
import { useEffect, useState } from "react";
import { useTranslation, useDocumentDrawer } from "@payloadcms/ui";
import { usePresetsConfig } from "../../usePresetsConfig.js";
import { TrashIcon } from "@payloadcms/ui/icons/Trash";
import { EditIcon } from "@payloadcms/ui/icons/Edit";
import * as Popover from "@radix-ui/react-popover";

import "./styles.scss";
import { PresetAdminComponentCell } from "../../PresetAdminComponentCell";

function EditPresetButton({
  presetId,
  onAfterSave,
  onOpen,
  onDrawerOpenChange,
}: {
  presetId: string | number;
  onAfterSave?: () => void;
  onOpen?: () => void;
  onDrawerOpenChange?: (isOpen: boolean) => void;
}) {
  const { slug } = usePresetsConfig();
  const [DocumentDrawer, , { openDrawer, isDrawerOpen }] = useDocumentDrawer({
    collectionSlug: slug,
    id: presetId,
  });

  useEffect(() => {
    onDrawerOpenChange?.(isDrawerOpen);
  }, [isDrawerOpen]);

  return (
    <>
      <button
        className="preset-action edit-preset"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen?.();
          openDrawer();
        }}
      >
        <EditIcon className="edit-preset__icon" />
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        <DocumentDrawer onSave={onAfterSave} />
      </div>
    </>
  );
}

interface Props {
  preset: Preset | null;
  mediaCollection: string;
  label?: string;
  onSelect: (preset: Preset | null) => void;
  onDeleteRequest?: (preset: Preset) => void;
  onPresetUpdate?: () => void;
  tabIndex?: number;
  onFocus?: () => void;
  isScrolling?: boolean;
}

export function PresetItem({
  preset,
  mediaCollection,
  label,
  onSelect,
  onDeleteRequest,
  onPresetUpdate,
  tabIndex,
  isScrolling,
}: Props) {
  const { preview } = preset ?? {};

  const { t } = useTranslation();

  const [media, setMedia] = useState<MediaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const isOpen = (isHovered || isKeyboardFocused) && !isScrolling && !isEditDrawerOpen;

  const mediaId = typeof preview === "number" ? preview : preview?.id;
  const mediaUrl = media?.url;

  const handleRemoveButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsHovered(false);
    setIsKeyboardFocused(false);
    if (preset) onDeleteRequest?.(preset);
  };

  const handleButtonFocus = () => {
    setIsKeyboardFocused(true);
  };

  useEffect(() => {
    if (!isKeyboardFocused) return;

    const handleMouseMove = () => setIsKeyboardFocused(false);

    document.addEventListener("mousemove", handleMouseMove, { once: true });

    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [isKeyboardFocused]);

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
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={handleButtonFocus}
          onBlur={() => setIsKeyboardFocused(false)}
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
                <EditPresetButton
                  presetId={preset.id}
                  onAfterSave={onPresetUpdate}
                  onOpen={() => {
                    setIsHovered(false);
                    setIsKeyboardFocused(false);
                  }}
                  onDrawerOpenChange={setIsEditDrawerOpen}
                />
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
            onCloseAutoFocus={(e) => e.preventDefault()}
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
