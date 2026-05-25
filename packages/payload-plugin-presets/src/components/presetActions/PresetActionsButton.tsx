"use client";

import { useRowLabel } from "@payloadcms/ui";
import { SaveAsPresetCore } from "./BlockLabelWithPresets/SaveAsPresetCore.js";
import type { PresetBlockData } from "./BlockLabelWithPresets/types.js";

export function PresetActionsButton() {
  const { data, rowNumber } = useRowLabel<PresetBlockData>();
  return (
    <SaveAsPresetCore
      presetBlockData={data as PresetBlockData}
      rowIndex={rowNumber ?? 0}
    />
  );
}
