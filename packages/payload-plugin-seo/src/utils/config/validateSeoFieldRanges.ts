import type { Config } from "payload";
import { PLUGIN_NAME } from "../../constants";
import { fieldRangeOf, fieldRangesFor } from "../../measure/fieldRanges";
import type { RangeOverride } from "../../measure/measure";
import type { SeoFieldKind } from "../../server/generate/prompts";
import type { ResolvedSeoThresholds } from "../../types/config";
import { readNumber } from "../readNumber";
import { getComponentPath } from "./getComponentPath";

const SEO_FIELD_PATH = getComponentPath("components/SeoField", "SeoField");

type UnknownRecord = Record<string, unknown>;

interface SeoFieldRange {
  path: string;
  kind: SeoFieldKind;
  range: RangeOverride | undefined;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function recordsIn(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function seoFieldOf(field: UnknownRecord, path: string): SeoFieldRange | undefined {
  const admin = isRecord(field.admin) ? field.admin : {};
  const components = isRecord(admin.components) ? admin.components : {};
  const component = isRecord(components.Field) ? components.Field : {};
  const props = isRecord(component.clientProps) ? component.clientProps : {};
  if (component.path !== SEO_FIELD_PATH) return undefined;
  if (props.kind !== "title" && props.kind !== "description") return undefined;

  const range = isRecord(props.range)
    ? { min: readNumber(props.range, "min"), max: readNumber(props.range, "max") }
    : undefined;

  return { path, kind: props.kind, range };
}

function seoFieldsIn(fields: unknown, parentPath: string): SeoFieldRange[] {
  return recordsIn(fields).flatMap((field) => {
    const path = typeof field.name === "string" ? `${parentPath}.${field.name}` : parentPath;
    const own = seoFieldOf(field, path);
    const nested = [
      ...seoFieldsIn(field.fields, path),
      ...recordsIn(field.tabs).flatMap((tab) => seoFieldsIn(tab.fields, path)),
      ...recordsIn(field.blocks).flatMap((block) => seoFieldsIn(block.fields, path)),
    ];

    return own ? [own, ...nested] : nested;
  });
}

export function validateSeoFieldRanges(
  config: Pick<Config, "collections" | "globals">,
  thresholds: ResolvedSeoThresholds
): void {
  const ranges = fieldRangesFor(thresholds);
  const owners = [...(config.collections ?? []), ...(config.globals ?? [])];

  for (const owner of owners) {
    for (const { path, kind, range } of seoFieldsIn(owner.fields, owner.slug)) {
      const { min, max } = fieldRangeOf(ranges[kind], range);
      if (min >= max) {
        throw new Error(
          `[${PLUGIN_NAME}] The ${kind} field "${path}" has range min (${min}) not lower than max (${max}) after applying thresholds.`
        );
      }
    }
  }
}
