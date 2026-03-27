"use client";

import {
  Pill,
  SectionTitle,
  useConfig,
  useRowLabel,
  useTranslation,
} from "@payloadcms/ui";
import { SaveAsPresetCore } from "./SaveAsPresetCore";
import { PresetBlockData } from "./types";

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
  const { config } = useConfig();
  const { i18n } = useTranslation();

  const block = (
    config.blocksMap as Record<string, (typeof config.blocksMap)[string]>
  )[data.blockType];
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
