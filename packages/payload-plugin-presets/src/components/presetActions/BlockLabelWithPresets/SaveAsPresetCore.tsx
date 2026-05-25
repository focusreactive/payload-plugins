"use client";

import {
  PopupList,
  useForm,
  useTranslation,
  toast,
  useAuth,
  useDocumentDrawer,
} from "@payloadcms/ui";
import type { Data } from "payload";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useOpenDrawer } from "../../blocksDrawer/OpenDrawerContext.js";
import { usePresetsConfig } from "../../usePresetsConfig.js";
import { cleanPresetData } from "../../utils.js";
import type { PresetBlockData } from "./types.js";

interface SaveAsPresetCoreProps {
  presetBlockData: PresetBlockData;
  rowIndex: number;
}

export function SaveAsPresetCore({
  presetBlockData,
  rowIndex,
}: SaveAsPresetCoreProps) {
  const { blockType: presetType } = presetBlockData;
  const { slug, excludeKeys } = usePresetsConfig();
  const openPresetsDrawer = useOpenDrawer();
  const excludeSet = new Set(excludeKeys);

  const [DocumentDrawer, , { openDrawer, closeDrawer }] = useDocumentDrawer({
    collectionSlug: slug,
  });

  const { user } = useAuth();
  const { getData } = useForm();
  const tenantId =
    getData()?.tenant ?? user?.tenant?.id ?? user?.tenant ?? null;

  const { t } = useTranslation();

  const anchorRef = useRef<HTMLDivElement>(null);
  const suppressNextActionsButtonClickRef = useRef(false);
  const interceptAddBelowRef = useRef<((event: MouseEvent) => void) | null>(
    null
  );
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null
  );

  useEffect(() => {
    if (!presetType) {return;}

    const row = anchorRef.current?.closest(".blocks-field__row");
    if (!row) {return;}

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const clickedButton = target.closest?.(".array-actions__button");
      if (!clickedButton) {return;}

      const nearestRow = clickedButton.closest(
        ".blocks-field__row, .array-field__row"
      );
      if (nearestRow !== row) {return;}

      if (suppressNextActionsButtonClickRef.current) {
        suppressNextActionsButtonClickRef.current = false;
        return;
      }

      setTimeout(() => {
        if (interceptAddBelowRef.current) {
          document.removeEventListener(
            "click",
            interceptAddBelowRef.current,
            true
          );
        }

        const interceptAddBelow = (event: MouseEvent) => {
          document.removeEventListener("click", interceptAddBelow, true);
          interceptAddBelowRef.current = null;

          if (!(event.target as Element).closest?.(".array-actions__add")) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const actionsButton = row.querySelector<HTMLButtonElement>(
            ".array-actions__button"
          );

          if (actionsButton) {
            suppressNextActionsButtonClickRef.current = true;
            actionsButton.click();
          }

          openPresetsDrawer?.(rowIndex + 1);
        };

        interceptAddBelowRef.current = interceptAddBelow;
        document.addEventListener("click", interceptAddBelow, true);

        const list = document.body.querySelector(
          ".popup__content .popup-button-list"
        );

        if (list) {
          const existing = list.querySelector(
            "[data-save-as-preset-container]"
          ) as HTMLDivElement | null;
          if (existing) {
            setPortalContainer(existing);
          } else {
            const container = document.createElement("div");
            container.dataset.saveAsPresetContainer = "true";
            list.insertBefore(container, list.firstChild);
            setPortalContainer(container);
          }
        }
      }, 0);
    };

    row.addEventListener("click", handleClick);

    return () => {
      row.removeEventListener("click", handleClick);

      if (interceptAddBelowRef.current) {
        document.removeEventListener(
          "click",
          interceptAddBelowRef.current,
          true
        );
        interceptAddBelowRef.current = null;
      }
    };
  }, [openPresetsDrawer, presetType, rowIndex]);

  const blockContent = cleanPresetData(
    presetBlockData ?? {},
    excludeSet
  ) as Record<string, unknown>;

  const data = presetType
    ? ({
        name: `${presetType.charAt(0).toUpperCase() + presetType.slice(1)} ${new Date().toLocaleDateString()}`,
        presetBlock: [{ blockType: presetType, ...blockContent }],
        tenant: tenantId,
      } as Data)
    : undefined;

  return (
    <>
      <div ref={anchorRef} style={{ display: "none" }} />

      {presetType &&
        portalContainer &&
        createPortal(
          <div>
            <PopupList.Button
              className="popup-button-list__button array-actions__action"
              onClick={openDrawer}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon"
              >
                <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                <path d="M7 3v4a1 1 0 0 0 1 1h7" />
              </svg>

              {t("presetsPlugin:presetActions:saveButton" as never)}
            </PopupList.Button>
          </div>,
          portalContainer
        )}

      <DocumentDrawer
        initialData={data}
        onSave={({ doc }) => {
          const document = doc as Data;

          toast.success(
            t("presetsPlugin:presetActions:successSaved" as never, {
              name: document.name,
            })
          );
          closeDrawer();
        }}
      />
    </>
  );
}
