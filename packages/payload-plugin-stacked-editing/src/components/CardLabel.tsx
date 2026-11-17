"use client";

import {
  useConfig,
  useDocumentInfo,
  useForm,
  useFormFields,
  useRowLabel,
  useTranslation,
} from "@payloadcms/ui";
import type { ClientField } from "payload";
import { useMemo } from "react";

import { createTranslate, kindLabelOf } from "../lib/breadcrumbs.js";
import { previewConfigOf, resolvePreview } from "../lib/preview.js";
import type { Preview } from "../lib/preview.js";
import { resolveRowChain } from "../lib/resolveRowChain.js";
import { STACKED_EDITING_CSS } from "./styles.js";
import { useThumbnail } from "./useThumbnail.js";

const BASE = "stacked-editing-card";

const ICON_PATH = {
  blocks: "M2.5 3.5h4.5v4.5H2.5zM9 3.5h4.5v4.5H9zM2.5 10h4.5v2.5H2.5zM9 10h4.5v2.5H9z",
  array: "M3 4.5h10M3 8h10M3 11.5h10",
} as const;

const Thumbnail = ({
  fallbackImage,
  kind,
  preview,
}: {
  fallbackImage?: string | undefined;
  kind: "blocks" | "array";
  preview: Preview;
}) => {
  const url = useThumbnail(preview.media);
  if (url === undefined) {
    return <span aria-hidden className={`${BASE}__thumb ${BASE}__thumb--loading`} />;
  }
  const src = url ?? fallbackImage;
  if (src) {
    return (
      <span aria-hidden className={`${BASE}__thumb`}>
        {/* A 34px admin thumbnail, not page content: next/image would add nothing here. */}
        {/* oxlint-disable-next-line next/no-img-element */}
        <img alt="" className={`${BASE}__image`} loading="lazy" src={src} />
      </span>
    );
  }
  return (
    <span aria-hidden className={`${BASE}__thumb ${BASE}__thumb--icon`}>
      <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
        <path
          d={ICON_PATH[kind]}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.3"
        />
      </svg>
    </span>
  );
};

const pad = (index: number): string => String(index + 1).padStart(2, "0");

/**
 * A Sanity-style card for an array or blocks row header: thumbnail, title, subtitle. Read from the
 * row's `admin.custom.preview` (see `definePreview`) or the defaults, live from form state.
 *
 * The plugin sets it as the `RowLabel` of array fields and the `Label` of blocks that have none of
 * their own. Custom labels can render it too: it only needs Payload's row label context.
 */
export const CardLabel = () => {
  const { data, path: rowPath, rowNumber } = useRowLabel<{ blockType?: string }>();
  const { config, getEntityConfig } = useConfig();
  const { collectionSlug, globalSlug } = useDocumentInfo();
  const { getFields } = useForm();
  const { i18n, t } = useTranslation();

  const translate = useMemo(
    () =>
      createTranslate({
        fallbackLanguage: i18n.fallbackLanguage,
        language: i18n.language,
        t: t as (key: string) => string,
      }),
    [i18n.fallbackLanguage, i18n.language, t]
  );

  const entity = getEntityConfig({ collectionSlug, globalSlug });
  const blockType = data?.blockType;
  const level = useMemo(() => {
    if (!rowPath || !entity) {
      return undefined;
    }
    const chain = resolveRowChain({
      blocksMap: config.blocksMap,
      fields: entity.fields as ClientField[],
      getBlockType: ({ fieldPath, rowIndex, rowPath: path }) => {
        if (path === rowPath && blockType) {
          return blockType;
        }
        const rows = getFields()[fieldPath]?.rows as { blockType?: string }[] | undefined;
        return rows?.[rowIndex]?.blockType;
      },
      permissions: true,
      rowPath,
    });
    return chain.complete ? chain.levels.at(-1) : undefined;
  }, [blockType, config.blocksMap, entity, getFields, rowPath]);

  const imageCollections = useMemo(
    () => new Set(config.collections.filter((c) => Boolean(c.upload)).map((c) => c.slug)),
    [config.collections]
  );

  // Re-rendered only when the card's own text changes, not on every keystroke in the document.
  const serialized = useFormFields(([fields]) => {
    if (!level) {
      return "";
    }
    const preview = resolvePreview({
      fields: level.fields,
      getRowCount: (relative) =>
        (fields[`${rowPath}.${relative}`]?.rows as unknown[] | undefined)?.length,
      getValue: (relative) => fields[`${rowPath}.${relative}`]?.value,
      isImageCollection: (slug) => imageCollections.has(slug),
      kindLabel: kindLabelOf(level, translate),
      translate,
      withBlockName: Boolean(level.block),
      ...(previewConfigOf(level) ? { select: previewConfigOf(level)?.select } : {}),
    });
    return JSON.stringify(preview);
  });

  const preview: Preview = serialized ? (JSON.parse(serialized) as Preview) : {};
  const index = typeof rowNumber === "number" ? rowNumber : (level?.rowIndex ?? 0);
  const fallback = level ? `${kindLabelOf(level, translate)} ${pad(index)}` : pad(index);

  return (
    <span className={BASE}>
      <style href="focus-reactive-stacked-editing" precedence="default">
        {STACKED_EDITING_CSS}
      </style>
      <span className={`${BASE}__number`}>{pad(index)}</span>
      <Thumbnail
        fallbackImage={level?.block?.imageURL}
        kind={level?.block ? "blocks" : "array"}
        preview={preview}
      />
      <span className={`${BASE}__text`}>
        <span className={`${BASE}__title${preview.title ? "" : ` ${BASE}__title--empty`}`}>
          {preview.title ?? fallback}
        </span>
        {preview.subtitle ? <span className={`${BASE}__subtitle`}>{preview.subtitle}</span> : null}
      </span>
    </span>
  );
};
