"use client";

import { MediaData, Preset } from "../../shared";
import { useEffect, useRef, useState } from "react";
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
  const { t } = useTranslation();
  const [DocumentDrawer, , { openDrawer, closeDrawer, isDrawerOpen }] = useDocumentDrawer({
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
        aria-label={t("general:edit" as never)}
        title={t("general:edit" as never)}
        onClick={(e) => {
          e.stopPropagation();
          onOpen?.();
          openDrawer();
        }}
      >
        <EditIcon className="edit-preset__icon" />
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        <DocumentDrawer
          onSave={() => {
            closeDrawer();
            onAfterSave?.();
          }}
        />
      </div>
    </>
  );
}

interface Props {
  preset: Preset | null;
  fallbackImageURL?: string | null;
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
  fallbackImageURL,
  mediaCollection,
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
  const suppressNextFocus = useRef(false);

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
    if (suppressNextFocus.current) {
      suppressNextFocus.current = false;
      return;
    }
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
      <Popover.Anchor asChild>
        <div
          className="preset-item"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            type="button"
            className="preset-item__main"
            onClick={() => onSelect(preset)}
            onFocus={handleButtonFocus}
            onBlur={() => setIsKeyboardFocused(false)}
            tabIndex={tabIndex}
          >
            <div className="preset-item__thumbnail" data-blank={preset ? undefined : ""}>
              {!hasPreview && !isLoading && fallbackImageURL ? (
                <img className="preset-item__fallback" src={fallbackImageURL} alt="" />
              ) : (
                <PresetAdminComponentCell media={media} isLoading={isLoading} size="md" />
              )}
            </div>

            <div className="preset-item__text">
              <div className="preset-item__label">
                {preset ? preset.name : t("presetsPlugin:blocksDrawer:blank" as never)}
              </div>
              {!preset && (
                <div className="preset-item__hint">
                  {t("presetsPlugin:blocksDrawer:blankHint" as never)}
                </div>
              )}
            </div>
          </button>

          <div className="preset-item__actions">
            {preset?.id && (
              <EditPresetButton
                presetId={preset.id}
                onAfterSave={onPresetUpdate}
                onOpen={() => {
                  setIsHovered(false);
                  setIsKeyboardFocused(false);
                }}
                onDrawerOpenChange={(isOpen) => {
                  if (!isOpen) suppressNextFocus.current = true;
                  setIsEditDrawerOpen(isOpen);
                }}
              />
            )}
            {preset?.name && (
              <button
                className="preset-action remove-preset"
                type="button"
                aria-label={t("general:delete" as never)}
                title={t("general:delete" as never)}
                onClick={handleRemoveButtonClick}
              >
                <TrashIcon className="remove-preset__icon" />
              </button>
            )}
          </div>
        </div>
      </Popover.Anchor>

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
