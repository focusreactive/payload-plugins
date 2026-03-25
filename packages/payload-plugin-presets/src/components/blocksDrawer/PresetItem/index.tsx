"use client";

import { MediaData, Preset } from "../../shared";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation, ConfirmationModal, useModal } from "@payloadcms/ui";
import { usePresetsConfig } from "../../usePresetsConfig.js";
import Image from "next/image";
import { TrashIcon } from "@payloadcms/ui/icons/Trash";

import "./styles.scss";
import { PresetAdminComponentCell } from "../../PresetAdminComponentCell";

const POPUP_WIDTH = 316;
const POPUP_HEIGHT = 300;
const HOVER_GAP = 8;

interface Props {
  preset: Preset | null;
  mediaCollection: string;
  label?: string;
  onSelect: (preset: Preset | null) => void;
  onDeleteButtonClick?: () => void;
  onDelete?: (presetId: string | number) => void;
}

export function PresetItem({
  preset,
  mediaCollection,
  label,
  onSelect,
  onDeleteButtonClick,
  onDelete,
}: Props) {
  const { preview } = preset ?? {};

  const modalSlug = `delete-preset-${preset?.id}`;
  const { openModal } = useModal();
  const { slug: presetsCollectionSlug } = usePresetsConfig();

  const { t } = useTranslation();

  const [media, setMedia] = useState<MediaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);

  const mediaId = typeof preview === "number" ? preview : preview?.id;
  const mediaUrl = media?.url;

  const handleMouseEnter = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    const fitsRight = rect.right + HOVER_GAP + POPUP_WIDTH <= window.innerWidth;
    const fitsLeft = rect.left - HOVER_GAP - POPUP_WIDTH >= 0;
    const fitsTop = rect.top - HOVER_GAP - POPUP_HEIGHT >= 0;

    let style: React.CSSProperties;

    if (fitsRight) {
      style = {
        top: rect.top,
        left: rect.right + HOVER_GAP,
      };
    } else if (fitsLeft) {
      style = {
        top: rect.top,
        right: window.innerWidth - rect.left + HOVER_GAP,
      };
    } else if (fitsTop) {
      style = {
        bottom: window.innerHeight - rect.top + HOVER_GAP,
        left: rect.left,
      };
    } else {
      style = {
        top: rect.bottom + HOVER_GAP,
        left: rect.left,
      };
    }

    setPortalStyle({
      position: "fixed",
      zIndex: 9999,
      ...style,
    });
    setIsOpen(true);
  };

  const handleRemoveButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    setIsOpen(false);
    onDeleteButtonClick?.();

    openModal(modalSlug);
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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="popover__thumbnail-card thumbnail-card thumbnail-card--has-on-click thumbnail-card--align-label-center"
        onClick={() => onSelect(preset)}
        onMouseEnter={handleMouseEnter}
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

      {isOpen &&
        !isLoading &&
        media &&
        mediaUrl &&
        createPortal(
          <div
            className="preset-preview-cell__popup"
            style={portalStyle}
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
          </div>,
          document.body,
        )}

      {preset?.id && (
        <ConfirmationModal
          className="confirmation-modal"
          modalSlug={modalSlug}
          heading={t("presetsPlugin:deletePreset:heading" as never)}
          body={t("presetsPlugin:deletePreset:body" as never, {
            name: preset.name,
          })}
          confirmingLabel={t("presetsPlugin:deletePreset:confirming" as never)}
          confirmLabel={t("presetsPlugin:deletePreset:confirm" as never)}
          cancelLabel={t("presetsPlugin:deletePreset:cancel" as never)}
          onConfirm={async () => {
            const res = await fetch(
              `/api/${presetsCollectionSlug}/${preset.id}`,
              { method: "DELETE" },
            );
            if (res.ok) {
              onDelete?.(preset.id);
            }
          }}
        />
      )}
    </>
  );
}
