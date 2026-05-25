"use client";

import { useConfig } from "@payloadcms/ui";
import type { ArrayField, BlocksField, CollapsibleField, Field, GroupField, RowField, TabsField } from "payload";
import { findFieldByName, getLabelString } from "../../../services/fieldLabels/utils/schemaUtils";

function buildBreadcrumb(positionPath: string, leafLabel: string, schemaFields: Field[]) {
  const segments = positionPath.split(".");
  const parts: string[] = [];
  let currentFields = schemaFields;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i] ?? "";
    const isLast = i === segments.length - 1;

    if (/^\d+$/.test(seg)) {
      parts.push(`#${parseInt(seg, 10) + 1}`);
      continue;
    }

    if (isLast) {
      parts.push(leafLabel);
      break;
    }

    const field = findFieldByName(currentFields, seg);
    if (!field) {
      parts.push(seg);
      currentFields = [];
      continue;
    }

    parts.push(getLabelString(field));

    if (field.type === "array") {
      currentFields = (field as ArrayField).fields;
    } else if (field.type === "blocks") {
      currentFields = (field as BlocksField).blocks.flatMap((b) => b.fields);
    } else if (field.type === "group") {
      currentFields = (field as GroupField).fields;
    } else if (field.type === "tabs") {
      currentFields = (field as TabsField).tabs.flatMap((t) => t.fields ?? []);
    } else if (field.type === "collapsible" || field.type === "row") {
      currentFields = (field as CollapsibleField | RowField).fields;
    } else {
      currentFields = [];
    }
  }

  return parts.join(" > ");
}

export function useFieldBreadcrumb(
  positionPath: string | undefined,
  leafLabel: string | null | undefined,
  collectionSlug: string | null | undefined,
  globalSlug: string | null,
) {
  const { config } = useConfig();

  if (!positionPath || !leafLabel) return leafLabel ?? positionPath ?? "";
  if (!positionPath.includes(".")) return leafLabel;

  const schemaFields =
    collectionSlug ?
      (config.collections.find((c) => c.slug === collectionSlug)?.fields ?? [])
    : (config.globals?.find((g) => g.slug === globalSlug)?.fields ?? []);

  return buildBreadcrumb(positionPath, leafLabel, schemaFields as Field[]);
}
