import type { ClientField } from "payload";

import { fieldAtPath, visibleTopLevelFields } from "./fieldLookup.js";
import type { AnyField } from "./fieldLookup.js";
import type { Translate } from "./labels.js";
import { mediaOf, valueToText } from "./previewValues.js";
import type { PreviewMedia } from "./previewValues.js";

export type { PreviewMedia } from "./previewValues.js";

export type PreviewSelect = {
  title?: string;
  subtitle?: string;
  media?: string;
};

export type PreviewConfig = { select: PreviewSelect };

/** Row card config for `admin.custom.preview` on a block or array field: `{ title, subtitle, media }` paths relative to the row. */
export const definePreview = (select: PreviewSelect): PreviewConfig => ({ select });

export const previewConfigOf = (owner: {
  field: { admin?: unknown };
  block?: { admin?: unknown };
}): PreviewConfig | undefined => {
  const source = (owner.block ?? owner.field).admin as
    | { custom?: { preview?: Partial<PreviewConfig> } }
    | undefined;
  const select = source?.custom?.preview?.select;
  return select && typeof select === "object" ? { select } : undefined;
};

export type Preview = {
  title?: string;
  subtitle?: string;
  media?: PreviewMedia;
};

export type PreviewInput = {
  fields: readonly ClientField[];
  select?: PreviewSelect;
  getValue: (relativePath: string) => unknown;
  getRowCount?: (relativePath: string) => number | undefined;
  translate: Translate;
  defaultSubtitle?: string;
  isImageCollection?: (slug: string) => boolean;
  withBlockName?: boolean;
};

const DEFAULT_TITLE_FIELD_TYPES = new Set(["text", "textarea", "email", "select", "radio"]);
const FALLBACK_TITLE_FIELD_TYPES = new Set(["richText"]);
const LENGTH_SUFFIX = ".length";

const rowCountText = (input: PreviewInput, arrayPath: string): string | undefined => {
  const count = input.getRowCount?.(arrayPath);
  if (count === undefined) {
    return undefined;
  }
  const field = fieldAtPath(input.fields, arrayPath);
  const noun = input.translate(count === 1 ? field?.labels?.singular : field?.labels?.plural);
  return noun ? `${count} ${noun}` : String(count);
};

const selectedText = (input: PreviewInput, path: string): string | undefined =>
  path.endsWith(LENGTH_SUFFIX)
    ? rowCountText(input, path.slice(0, -LENGTH_SUFFIX.length))
    : valueToText(input.getValue(path), fieldAtPath(input.fields, path), input.translate);

const firstTextOfType = (
  input: PreviewInput,
  fields: AnyField[],
  types: Set<string>
): string | undefined => {
  for (const field of fields) {
    if (!field.name || !types.has(field.type)) {
      continue;
    }
    const text = valueToText(input.getValue(field.name), field, input.translate);
    if (text) {
      return text;
    }
  }
  return undefined;
};

const resolveTitle = (input: PreviewInput, fields: AnyField[]): string | undefined =>
  (input.withBlockName
    ? valueToText(input.getValue("blockName"), undefined, input.translate)
    : undefined) ||
  (input.select?.title ? selectedText(input, input.select.title) : undefined) ||
  firstTextOfType(input, fields, DEFAULT_TITLE_FIELD_TYPES) ||
  firstTextOfType(input, fields, FALLBACK_TITLE_FIELD_TYPES);

const resolveSubtitle = (input: PreviewInput): string | undefined =>
  (input.select?.subtitle ? selectedText(input, input.select.subtitle) : undefined) ??
  input.defaultSubtitle;

const resolveMedia = (input: PreviewInput, fields: AnyField[]): PreviewMedia | undefined => {
  const mediaPath = input.select?.media;
  if (mediaPath) {
    return mediaOf(input.getValue(mediaPath), fieldAtPath(input.fields, mediaPath));
  }
  const upload = fields.find(
    (field) =>
      field.type === "upload" &&
      typeof field.relationTo === "string" &&
      (input.isImageCollection?.(field.relationTo) ?? true)
  );
  return upload?.name ? mediaOf(input.getValue(upload.name), upload) : undefined;
};

export const resolvePreview = (input: PreviewInput): Preview => {
  const fields = visibleTopLevelFields(input.fields);
  const title = resolveTitle(input, fields);
  const subtitle = resolveSubtitle(input);
  const media = resolveMedia(input, fields);
  return {
    ...(title ? { title } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(media ? { media } : {}),
  };
};
