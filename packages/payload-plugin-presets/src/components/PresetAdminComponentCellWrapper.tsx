"use client";

import { useEffect, useState } from "react";
import { PresetAdminComponentCell } from "./PresetAdminComponentCell.js";
import { usePresetsConfig } from "./usePresetsConfig.js";
import type { MediaData } from "./shared/index.js";

interface CellProps {
  cellData?: number | string | MediaData | null;
}

export function PresetAdminComponentCellWrapper(props: CellProps) {
  const { cellData } = props;
  const { mediaCollection } = usePresetsConfig();
  const [media, setMedia] = useState<MediaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mediaId =
    typeof cellData === "number" || typeof cellData === "string"
      ? cellData
      : cellData?.id;

  useEffect(() => {
    if (!mediaId) {
      setMedia(null);
      setIsLoading(false);
      return;
    }

    if (typeof cellData === "object" && cellData !== null) {
      setMedia(cellData as MediaData);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    fetch(`/api/${mediaCollection}/${mediaId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setMedia(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setMedia(null);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [mediaId, cellData, mediaCollection]);

  return (
    <PresetAdminComponentCell media={media} isLoading={isLoading} size="sm" />
  );
}
