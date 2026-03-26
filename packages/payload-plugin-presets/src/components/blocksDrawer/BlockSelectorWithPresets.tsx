"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import * as Popover from "@radix-ui/react-popover";
import {
  useTranslation,
  ShimmerEffect,
  ChevronIcon,
  ConfirmationModal,
  useModal,
} from "@payloadcms/ui";
import type { ClientBlock } from "payload";
import { usePresetsConfig } from "../usePresetsConfig.js";
import { DefaultBlockImage, type Preset } from "../shared/index.js";
import "./BlockSelectorWithPresets.scss";
import { PresetItem } from "./PresetItem/index.js";

type BlockSelectorWithPresetsProps = {
  blocks: (ClientBlock | string)[];
  onSelect: (blockType: string, preset?: Preset | null) => void;
  tenantId?: number | string | null;
};

export const BlockSelectorWithPresets: React.FC<
  BlockSelectorWithPresetsProps
> = ({ blocks, onSelect, tenantId }) => {
  const { slug: presetsCollectionSlug, presetTypes } = usePresetsConfig();
  const { i18n, t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeBlockSlug, setActiveBlockSlug] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [presetsCache, setPresetsCache] = useState<Preset[]>([]);

  // Filter and group blocks
  const clientBlocks = blocks.filter((block): block is ClientBlock => {
    if (typeof block === "string") return false;
    if (!searchTerm) return true;
    const label = getBlockLabel(block, i18n.language);
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const groupedBlocks = clientBlocks.reduce(
    (acc, block) => {
      const custom = block.admin?.custom as { group?: string } | undefined;
      const group = custom?.group || "Blocks";
      if (!acc[group]) acc[group] = [];
      acc[group].push(block);
      return acc;
    },
    {} as Record<string, ClientBlock[]>,
  );

  // Fetch presets for specific block type
  const fetchPresets = async () => {
    setIsLoadingPresets(true);
    try {
      const params = new URLSearchParams();

      if (tenantId) {
        params.append("where[tenant][equals]", String(tenantId));
      }

      params.append("depth", "0");
      params.append("limit", "50");

      const response = await fetch(
        `/api/${presetsCollectionSlug}?${params.toString()}`,
      );
      const data = await response.json();
      const fetchedPresets = data.docs || [];

      setPresetsCache(fetchedPresets);
    } catch (error) {
      console.error("Failed to fetch presets:", error);
      setPresetsCache([]);
    } finally {
      setIsLoadingPresets(false);
    }
  };

  const handleBlockClick = (block: ClientBlock) => {
    const hasPresets = presetTypes.includes(block.slug);

    if (!hasPresets) {
      onSelect(block.slug);
      return;
    }

    if (activeBlockSlug === block.slug) {
      setActiveBlockSlug(null);
    } else {
      setActiveBlockSlug(block.slug);
    }
  };

  const handlePresetSelect = (blockType: string, preset: Preset | null) => {
    onSelect(blockType, preset);
    setActiveBlockSlug(null);
  };

  const handleDeletePreset = (id: string | number) => {
    setPresetsCache((prev) => prev.filter((p) => p.id !== id));
  };

  // Get presets for specific block from cache
  const getBlockPresets = (blockSlug: string): Preset[] => {
    return presetsCache.filter((preset) => preset.type === blockSlug);
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  // Show loading state while fetching presets
  if (isLoadingPresets) {
    return (
      <>
        <ShimmerEffect height="40px" />

        <div className="blocks-drawer__blocks-wrapper">
          <div className="blocks-drawer__blocks">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="blocks-drawer__block">
                <ShimmerEffect
                  key={i}
                  height="100px"
                  animationDelay={`${i * 50}ms`}
                />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="block-search">
        <input
          className="block-search__input"
          placeholder={t(
            "presetsPlugin:blocksDrawer:searchPlaceholder" as never,
          )}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <svg
          className="icon icon--search"
          fill="none"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="stroke"
            d="M16 16L13.1333 13.1333M14.6667 9.33333C14.6667 12.2789 12.2789 14.6667 9.33333 14.6667C6.38781 14.6667 4 12.2789 4 9.33333C4 6.38781 6.38781 4 9.33333 4C12.2789 4 14.6667 6.38781 14.6667 9.33333Z"
            strokeLinecap="square"
          />
        </svg>
      </div>

      <div className="blocks-drawer__blocks-wrapper">
        {Object.entries(groupedBlocks).map(([group, groupBlocks]) => (
          <div key={group}>
            {Object.keys(groupedBlocks).length > 1 && (
              <p className="blocks-drawer__block-label">{group}</p>
            )}
            <ul className="blocks-drawer__blocks">
              {groupBlocks.map((block) => {
                const hasPresets = presetTypes.includes(block.slug);
                const isActive = activeBlockSlug === block.slug;
                const label = getBlockLabel(block, i18n.language);
                const blockPresets = getBlockPresets(block.slug);

                return (
                  <li key={block.slug} className="blocks-drawer__block">
                    <BlockCard
                      block={block}
                      label={label}
                      hasPresets={hasPresets}
                      isActive={isActive}
                      isMobile={isMobile}
                      presets={blockPresets}
                      onBlockClick={() =>
                        hasPresets
                          ? handleBlockClick(block)
                          : onSelect(block.slug)
                      }
                      onPresetSelect={handlePresetSelect}
                      onClose={() => setActiveBlockSlug(null)}
                      onDelete={handleDeletePreset}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
};

// Reusable BlockCard component
function useIsMobile(breakpoint = 500): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

type BlockCardProps = {
  block: ClientBlock;
  label: string;
  hasPresets: boolean;
  isActive: boolean;
  isMobile: boolean;
  presets: Preset[];
  onBlockClick: () => void;
  onPresetSelect: (blockType: string, preset: Preset | null) => void;
  onClose: () => void;
  onDelete: (presetId: string | number) => void;
};

const BlockCard: React.FC<BlockCardProps> = ({
  block,
  label,
  hasPresets,
  isActive,
  isMobile,
  presets,
  onBlockClick,
  onPresetSelect,
  onClose,
  onDelete,
}) => {
  const [deletingPreset, setDeletingPreset] = useState<Preset | null>(null);
  const { openModal } = useModal();
  const { slug: presetsCollectionSlug } = usePresetsConfig();
  const { t } = useTranslation();

  const modalSlug = `delete-preset-${block.slug}`;

  const handleDeleteRequest = (preset: Preset) => {
    setDeletingPreset(preset);
    openModal(modalSlug);
  };

  if (!hasPresets) {
    return (
      <button
        className="thumbnail-card thumbnail-card--has-on-click thumbnail-card--align-label-center"
        title={label}
        type="button"
        onClick={onBlockClick}
      >
        <BlockThumbnail imageURL={block.imageURL} label={label} />
        <div className="thumbnail-card__label">{label}</div>
      </button>
    );
  }

  return (
    <>
      <Popover.Root
        open={isActive}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Popover.Trigger asChild>
          <button
            className={`thumbnail-card thumbnail-card--has-on-click thumbnail-card--align-label-center ${isActive ? "thumbnail-card--active" : ""}`}
            title={label}
            type="button"
            onClick={onBlockClick}
          >
            <BlockThumbnail imageURL={block.imageURL} label={label} />
            <div className="thumbnail-card__label">
              {label}{" "}
              {presets.length > 0 ? `(${presets.length})` : ""}
              <ChevronIcon
                className={`thumbnail-card__chevron ${isActive ? "thumbnail-card__chevron--open" : ""}`}
              />
            </div>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="blocks-drawer__popover-content"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={8}
            avoidCollisions
            collisionPadding={8}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <PresetsList
              blockSlug={block.slug}
              label={label}
              presets={presets}
              onDeleteRequest={handleDeleteRequest}
              onSelect={(preset) => {
                onPresetSelect(block.slug, preset);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {deletingPreset && (
        <ConfirmationModal
          className="confirmation-modal"
          modalSlug={modalSlug}
          heading={t("presetsPlugin:deletePreset:heading" as never)}
          body={t("presetsPlugin:deletePreset:body" as never, {
            name: deletingPreset.name,
          })}
          confirmingLabel={t("presetsPlugin:deletePreset:confirming" as never)}
          confirmLabel={t("presetsPlugin:deletePreset:confirm" as never)}
          cancelLabel={t("presetsPlugin:deletePreset:cancel" as never)}
          onConfirm={async () => {
            const res = await fetch(
              `/api/${presetsCollectionSlug}/${deletingPreset.id}`,
              { method: "DELETE" },
            );
            if (res.ok) {
              onDelete(deletingPreset.id);
              setDeletingPreset(null);
              onClose();
            }
          }}
        />
      )}
    </>
  );
};

// Reusable BlockThumbnail component
type BlockThumbnailProps = {
  imageURL?: string | null;
  label: string;
};

const BlockThumbnail: React.FC<BlockThumbnailProps> = ({ imageURL, label }) => (
  <div className="thumbnail-card__thumbnail">
    {imageURL ? (
      <Image src={imageURL} alt={label} width={231} height={151} unoptimized />
    ) : (
      <div className="blocks-drawer__default-image">
        <DefaultBlockImage />
      </div>
    )}
  </div>
);

type PresetsListProps = {
  blockSlug: string;
  label: string;
  presets: Preset[];
  onSelect: (preset: Preset | null) => void;
  onDeleteRequest: (preset: Preset) => void;
};

const PresetsList: React.FC<PresetsListProps> = ({
  blockSlug,
  label,
  presets,
  onSelect,
  onDeleteRequest,
}) => {
  const filteredPresets = presets.filter((preset) => preset.type === blockSlug);
  const { mediaCollection } = usePresetsConfig();
  const { t } = useTranslation();

  return (
    <div className="blocks-drawer__presets-popup">
      {/* Empty option — no delete on the null preset */}
      <PresetItem
        preset={null}
        mediaCollection={mediaCollection}
        label={label}
        onSelect={onSelect}
      />

      {/* Presets list */}
      {filteredPresets.length > 0 &&
        filteredPresets.map((preset) => (
          <PresetItem
            key={preset.id}
            preset={preset}
            mediaCollection={mediaCollection}
            onSelect={onSelect}
            onDeleteRequest={onDeleteRequest}
          />
        ))}

      {/* No presets message */}
      {filteredPresets.length === 0 && (
        <div className="blocks-drawer__presets-empty">
          {t("presetsPlugin:blocksDrawer:noPresetsAvailable" as never)}
        </div>
      )}
    </div>
  );
};

function getBlockLabel(block: ClientBlock, locale: string): string {
  if (typeof block.labels?.singular === "string") {
    return block.labels.singular;
  }
  if (block.labels?.singular && typeof block.labels.singular === "object") {
    const labels = block.labels.singular as Record<string, string>;
    return labels[locale] || labels.en || block.slug;
  }
  return block.slug;
}
