import { Card, Stack, Text } from "@sanity/ui";
import React from "react";

import type { OnItemAppendType, Preset } from "../types";
import { addKeysToNodes } from "../utils";

export function Template({ preset, onItemAppend }: TemplateProps) {
  const handleAppendClick = () => {
    const processedValue = addKeysToNodes(preset.value);

    onItemAppend(processedValue);
  };

  return (
    <Card
      style={{
        border: "1px solid #E0E0E0",
        borderRadius: "4px",
        cursor: "copy",
        padding: "8px",
      }}
    >
      <Stack space={2} onClick={handleAppendClick}>
        <Text
          style={{
            fontSize: "16px",
            fontWeight: 500,
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          {preset.meta?.title}
        </Text>
        <img
          style={{
            borderRadius: 4,
            height: "auto",
            width: "100%",
          }}
          src={preset.meta.screenshot}
          alt={preset.meta?.title}
        />
      </Stack>
    </Card>
  );
}

interface TemplateProps {
  preset: Preset;
  onItemAppend: OnItemAppendType;
}
