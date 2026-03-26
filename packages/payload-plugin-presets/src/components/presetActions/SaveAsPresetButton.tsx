"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PopupList,
  useFieldPath,
  useForm,
  useTranslation,
  toast,
  useAuth,
  useDocumentDrawer,
} from "@payloadcms/ui";
import { getParentPath, getPresetTypeFromPath } from "../utils.js";
import { usePresetsConfig } from "../usePresetsConfig.js";
import { Data } from "payload";

/** Recursively remove excluded keys from object at all nesting levels */
function cleanPresetData(obj: unknown, excludeKeys: Set<string>): unknown {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanPresetData(item, excludeKeys));
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!excludeKeys.has(key)) {
      cleaned[key] = cleanPresetData(value, excludeKeys);
    }
  }
  return cleaned;
}

export function SaveAsPresetButton() {
  const { slug, presetTypes, excludeKeys } = usePresetsConfig();
  const excludeSet = new Set(excludeKeys);

  const [DocumentDrawer, , { openDrawer, closeDrawer }] = useDocumentDrawer({
    collectionSlug: slug,
  });

  const { user } = useAuth();
  const path = useFieldPath();
  const parentPath = getParentPath(path);
  const { getData, getDataByPath } = useForm();
  const tenantId =
    getData()?.tenant ?? user?.tenant?.id ?? user?.tenant ?? null;

  const { t } = useTranslation();

  const presetTypeFromPath = getPresetTypeFromPath(parentPath, presetTypes);
  const blockData =
    getDataByPath<{ blockType?: string } | null>(parentPath) ?? null;
  const presetType = presetTypeFromPath ?? blockData?.blockType;

  const anchorRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    if (!presetType) return;

    const row = anchorRef.current?.closest(".blocks-field__row");
    const triggerWrap = row?.querySelector(
      ".array-actions .popup__trigger-wrap",
    );

    if (!triggerWrap) return;

    const handleClick = () => {
      setTimeout(() => {
        const list = document.body.querySelector(
          ".popup__content .popup-button-list",
        );

        if (list) {
          const existing = list.querySelector(
            "[data-save-as-preset-container]",
          ) as HTMLDivElement | null;
          if (existing) {
            setPortalContainer(existing);
          } else {
            const container = document.createElement("div");
            container.setAttribute("data-save-as-preset-container", "true");
            list.insertBefore(container, list.firstChild);
            setPortalContainer(container);
          }
        }
      }, 0);
    };

    triggerWrap.addEventListener("click", handleClick);

    return () => triggerWrap.removeEventListener("click", handleClick);
  }, [presetType]);

  const groupData = getDataByPath<Record<string, unknown>>(parentPath);
  const data = presetType
    ? ({
        name: `${presetType.charAt(0).toUpperCase() + presetType.slice(1)} ${new Date().toLocaleDateString()}`,
        type: presetType,
        [presetType]: cleanPresetData(groupData ?? {}, excludeSet),
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
                stroke-width="1"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="icon"
              >
                <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                <path d="M7 3v4a1 1 0 0 0 1 1h7" />
              </svg>

              {t("presetsPlugin:presetActions:saveButton" as never)}
            </PopupList.Button>
          </div>,
          portalContainer,
        )}

      <DocumentDrawer
        initialData={data}
        onSave={({ doc }) => {
          const document = doc as Data;

          toast.success(
            t("presetsPlugin:presetActions:successSaved" as never, {
              name: document.name,
            }),
          );
          closeDrawer();
        }}
      />
    </>
  );
}
