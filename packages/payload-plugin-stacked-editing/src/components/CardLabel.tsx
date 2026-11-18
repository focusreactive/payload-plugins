"use client";

import { useRowLabel } from "@payloadcms/ui";
import { useMemo } from "react";

import { useRowChainResolver } from "../hooks/useRowChainResolver.js";
import { useRowPreview } from "../hooks/useRowPreview.js";
import { useTranslate } from "../hooks/useTranslate.js";
import { STYLE_HREF } from "../lib/constants.js";
import { padRowNumber, rowTypeLabelOf } from "../lib/labels.js";
import { STACKED_EDITING_CSS } from "../styles/index.js";
import { CardThumbnail } from "./CardThumbnail.js";

const BASE = "stacked-editing-card";

// Reads Payload's row-label context, not props: label wrappers (e.g. the presets plugin) drop field props.
export const CardLabel = () => {
  const { data, path: rowPath, rowNumber } = useRowLabel<{ blockType?: string }>();
  const translate = useTranslate();
  const resolve = useRowChainResolver();
  const blockType = data?.blockType;
  const level = useMemo(() => {
    const chain = rowPath ? resolve(rowPath) : undefined;
    return chain?.complete ? chain.levels.at(-1) : undefined;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- `blockType` re-resolves the row when its block changes
  }, [blockType, resolve, rowPath]);
  const preview = useRowPreview(level, translate);

  const rowIndex = typeof rowNumber === "number" ? rowNumber : (level?.rowIndex ?? 0);
  const rowNumberLabel = padRowNumber(rowIndex);
  const fallbackTitle = level
    ? `${rowTypeLabelOf(level, translate)} ${rowNumberLabel}`
    : rowNumberLabel;

  return (
    <span className={BASE}>
      <style href={STYLE_HREF} precedence="default">
        {STACKED_EDITING_CSS}
      </style>
      <span className={`${BASE}__number`}>{rowNumberLabel}</span>
      <CardThumbnail
        fallbackImage={level?.block?.imageURL}
        kind={level?.block ? "blocks" : "array"}
        media={preview.media}
      />
      <span className={`${BASE}__text`}>
        <span className={`${BASE}__title${preview.title ? "" : ` ${BASE}__title--empty`}`}>
          {preview.title ?? fallbackTitle}
        </span>
        {preview.subtitle ? <span className={`${BASE}__subtitle`}>{preview.subtitle}</span> : null}
      </span>
    </span>
  );
};
