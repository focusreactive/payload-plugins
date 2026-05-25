"use client";

import {
  Button,
  useFieldPath,
  useForm,
  useTranslation,
  useListDrawer,
  toast,
  useAuth,
} from "@payloadcms/ui";
import type { Data, FormState } from "payload";
import {
  getParentPath,
  getPresetTypeFromPath,
  buildSubFieldStateFromPreset,
} from "../utils.js";
import { usePresetsConfig } from "../usePresetsConfig.js";

import "./index.scss";

export function ApplyPresetButton() {
  const { slug: collectionSlug, presetTypes, excludeKeys } = usePresetsConfig();

  const { user } = useAuth();
  const path = useFieldPath();
  const parentPath = getParentPath(path);
  const { getData, getDataByPath, dispatchFields, replaceFieldRow } = useForm();
  const { t } = useTranslation();

  const presetTypeFromPath = getPresetTypeFromPath(parentPath, presetTypes);
  const blockData =
    getDataByPath<{ blockType?: string } | null>(parentPath) ?? null;
  const presetType = presetTypeFromPath ?? blockData?.blockType;

  const fullData = getData() as { tenant?: number } | null;
  const tenantId = fullData?.tenant ?? user?.tenant?.id ?? user?.tenant;

  const [ListDrawer, , { openDrawer, closeDrawer }] = useListDrawer({
    collectionSlugs: [collectionSlug],
    filterOptions: {
      [collectionSlug]: {
        "presetBlock.blockType": { equals: presetType },
        ...(tenantId ? { tenant: { equals: tenantId } } : {}),
      },
    },
  });

  if (!presetType) {
    return null;
  }

  const handleSelect = ({ doc }: { collectionSlug: string; doc: Data }) => {
    const preset = doc as Record<string, unknown>;
    const presetBlocks = preset.presetBlock as
      | Array<{ blockType: string; [key: string]: unknown }>
      | undefined;
    const presetBlockItem = presetBlocks?.[0];

    if (
      !preset ||
      !presetBlockItem ||
      presetBlockItem.blockType !== presetType
    ) {
      toast.error(t("presetsPlugin:applyPreset:errorInvalidPreset" as never));
      return;
    }

    const pathParts = parentPath.split(".");
    const rowIndex = Number(pathParts.pop());
    const arrayPath = pathParts.join(".");

    const baseState = buildSubFieldStateFromPreset(
      presetBlockItem,
      excludeKeys,
    );
    const subFieldState = Object.fromEntries(
      Object.entries(baseState).map(([key, entry]) => [
        key,
        { ...entry, isModified: true },
      ]),
    );

    try {
      if (typeof replaceFieldRow === "function") {
        replaceFieldRow({
          path: arrayPath,
          rowIndex,
          blockType: presetType,
          schemaPath: arrayPath,
          subFieldState: subFieldState as FormState,
        });
      } else {
        dispatchFields({
          type: "REPLACE_ROW",
          path: arrayPath,
          rowIndex,
          blockType: presetType,
          subFieldState,
        });
      }

      toast.success(
        t("presetsPlugin:applyPreset:successApplied" as never, {
          name: preset.name,
        }),
      );
      closeDrawer();
    } catch (err) {
      console.error("Apply preset error:", err);
      toast.error(t("presetsPlugin:applyPreset:errorApplyFailed" as never));
    }
  };

  const handleOpenDrawer = () => {
    openDrawer();
  };

  return (
    <>
      <Button buttonStyle="secondary" size="large" onClick={handleOpenDrawer}>
        {t("presetsPlugin:applyPreset:applyButton" as never)}
      </Button>
      <ListDrawer
        onSelect={handleSelect}
        allowCreate={true}
        enableRowSelections={false}
      />
    </>
  );
}
