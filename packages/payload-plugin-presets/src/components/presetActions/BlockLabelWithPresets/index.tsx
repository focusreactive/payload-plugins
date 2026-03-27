"use client";

import {
  Pill,
  SectionTitle,
  useRowLabel,
  useTranslation,
} from "@payloadcms/ui";
import { SaveAsPresetCore } from "./SaveAsPresetCore";
import { PresetBlockData } from "./types";
import { useBlocksConfig } from "../../blocksDrawer/BlocksConfigContext.js";

const baseClass = "blocks-field";

function resolveLabel(
  label: string | Record<string, string> | undefined,
  language: string,
) {
  if (typeof label === "string") return label;

  if (label && typeof label === "object") {
    return label[language] ?? label["en"] ?? Object.values(label)[0] ?? "";
  }

  return "";
}

export function BlockLabelWithPresets() {
  const { data: dataProp, path, rowNumber } = useRowLabel<PresetBlockData>();
  const data = dataProp as PresetBlockData;
  const blocks = useBlocksConfig();
  const { i18n } = useTranslation();

  const block = blocks?.find((b) => b.slug === data.blockType);
  const showBlockName = !block?.admin?.disableBlockName;

  return (
    <>
      <span className={`${baseClass}__block-number`}>
        {String((rowNumber ?? 0) + 1).padStart(2, "0")}
      </span>

      <Pill
        className={`${baseClass}__block-pill ${baseClass}__block-pill-${data.blockType}`}
        pillStyle="white"
        size="small"
      >
        {block?.labels?.singular
          ? resolveLabel(block.labels.singular, i18n.language)
          : data.blockType}
      </Pill>

      {showBlockName && (
        <SectionTitle path={`${path}.blockName`} readOnly={false} />
      )}

      <SaveAsPresetCore presetBlockData={data} />
    </>
  );
}
