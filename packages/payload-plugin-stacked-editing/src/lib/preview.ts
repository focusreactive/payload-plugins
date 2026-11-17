import type { ClientField } from "payload";

import type { Translate } from "./breadcrumbs.js";

/**
 * Sanity-style row preview: which of the row's fields make up its card. Paths are relative to the
 * row, dot paths allowed (`cta.label`, `image`); a path ending in `.length` counts the rows of an
 * array or blocks field (`points.length` → "2 Points").
 */
export type PreviewSelect = {
  title?: string;
  subtitle?: string;
  media?: string;
};

export type PreviewConfig = { select: PreviewSelect };

/**
 * Builds the value for `admin.custom.preview` on an array field or a block:
 *
 * ```ts
 * { name: 'items', type: 'array', admin: { custom: { preview: definePreview({ title: 'title', media: 'image' }) } } }
 * ```
 *
 * Plain data only — it travels to the admin inside the client config.
 */
export const definePreview = (select: PreviewSelect): PreviewConfig => ({ select });

/** `admin.custom.preview` of the block (blocks rows) or of the array field (array rows). */
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

export type PreviewMedia =
  | { kind: "doc"; relationTo: string; id: number | string }
  | { kind: "url"; url: string };

export type Preview = {
  title?: string;
  subtitle?: string;
  media?: PreviewMedia;
};

export type PreviewInput = {
  /** The row's own fields (block fields or array fields), client config. */
  fields: readonly ClientField[];
  select?: PreviewSelect;
  /** Value at a path relative to the row (from form state). */
  getValue: (relativePath: string) => unknown;
  /** Number of rows of the array/blocks field at a path relative to the row. */
  getRowCount?: (relativePath: string) => number | undefined;
  translate: Translate;
  /** Block label or the array's item label: the default subtitle. */
  kindLabel?: string;
  /** Whether a collection holds uploads that can be shown as a thumbnail. */
  isImageCollection?: (slug: string) => boolean;
  /** Blocks only: the row's `blockName`, which wins as the title when set. */
  withBlockName?: boolean;
};

const MAX_TEXT = 120;
/** Field types whose value can be a default title. */
const TEXT_TYPES = new Set(["text", "textarea", "email", "select", "radio"]);

type AnyField = {
  name?: string;
  type: string;
  fields?: ClientField[];
  tabs?: { name?: string; fields: ClientField[] }[];
  options?: (string | { label: unknown; value: string })[];
  labels?: { singular?: unknown; plural?: unknown };
  label?: unknown;
  relationTo?: string | string[];
  admin?: { hidden?: boolean };
  hidden?: boolean;
};

const clip = (text: string): string =>
  text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1).trimEnd()}…` : text;

type LexicalNode = { text?: unknown; children?: unknown; type?: unknown };

/** Plain text of the first block of a Lexical editor state that has any text. */
export const richTextToPlain = (value: unknown): string | undefined => {
  const root = (value as { root?: LexicalNode } | null | undefined)?.root;
  if (!root || !Array.isArray(root.children)) {
    return undefined;
  }
  const collect = (node: LexicalNode): string => {
    if (typeof node.text === "string") {
      return node.text;
    }
    if (node.type === "linebreak") {
      return " ";
    }
    return Array.isArray(node.children)
      ? (node.children as LexicalNode[]).map(collect).join("")
      : "";
  };
  for (const block of root.children as LexicalNode[]) {
    const text = collect(block).replaceAll(/\s+/gu, " ").trim();
    if (text) {
      return clip(text);
    }
  }
  return undefined;
};

const isEditorState = (value: unknown): boolean =>
  typeof value === "object" && value !== null && "root" in value;

/** Children of a field that sit at the same data level (unnamed containers). */
const transparentChildren = (field: AnyField): readonly ClientField[] | null => {
  if (field.type === "row" || field.type === "collapsible") {
    return field.fields ?? [];
  }
  if (field.type === "group" && !field.name) {
    return field.fields ?? [];
  }
  if (field.type === "tabs") {
    return (field.tabs ?? []).filter((tab) => !tab.name).flatMap((tab) => tab.fields);
  }
  return null;
};

/** Every named field at the row's own level, in order, seeing through unnamed containers. */
export const topLevelFields = (fields: readonly ClientField[]): AnyField[] => {
  const result: AnyField[] = [];
  for (const field of fields as unknown as AnyField[]) {
    const children = transparentChildren(field);
    if (children) {
      result.push(...topLevelFields(children));
    } else if (field.name) {
      result.push(field);
    }
  }
  return result;
};

/** The field at a dot path relative to the row (array indexes are skipped). */
export const fieldAtPath = (fields: readonly ClientField[], path: string): AnyField | undefined => {
  const [head, ...rest] = path.split(".").filter((segment) => !/^\d+$/u.test(segment));
  const field = topLevelFields(fields).find((candidate) => candidate.name === head);
  if (!field || rest.length === 0) {
    return field;
  }
  if (field.type === "group" || field.type === "array") {
    return fieldAtPath(field.fields ?? [], rest.join("."));
  }
  if (field.type === "tabs") {
    const tab = (field.tabs ?? []).find((candidate) => candidate.name === rest[0]);
    return tab ? fieldAtPath(tab.fields, rest.slice(1).join(".")) : undefined;
  }
  return undefined;
};

const optionLabel = (field: AnyField | undefined, value: string, translate: Translate): string => {
  const option = field?.options?.find((candidate) =>
    typeof candidate === "string" ? candidate === value : candidate.value === value
  );
  if (option && typeof option === "object") {
    return translate(option.label) || value;
  }
  return value;
};

/** A field value as one line of text, or `undefined` when it has none. */
export const valueToText = (
  value: unknown,
  field: AnyField | undefined,
  translate: Translate
): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (field?.type === "select" || field?.type === "radio") {
      return clip(optionLabel(field, trimmed, translate));
    }
    if (field?.type === "date") {
      const date = new Date(trimmed);
      return Number.isNaN(date.getTime()) ? trimmed : date.toLocaleDateString();
    }
    return clip(trimmed);
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    const labels = (value as string[]).map((item) => optionLabel(field, item, translate));
    return labels.length > 0 ? clip(labels.join(", ")) : undefined;
  }
  if (isEditorState(value)) {
    return richTextToPlain(value);
  }
  return undefined;
};

const LENGTH_SUFFIX = ".length";

const selectedText = (input: PreviewInput, path: string): string | undefined => {
  if (path.endsWith(LENGTH_SUFFIX)) {
    const base = path.slice(0, -LENGTH_SUFFIX.length);
    const count = input.getRowCount?.(base);
    if (count === undefined) {
      return undefined;
    }
    const field = fieldAtPath(input.fields, base);
    const noun = input.translate(count === 1 ? field?.labels?.singular : field?.labels?.plural);
    return noun ? `${count} ${noun}` : String(count);
  }
  return valueToText(input.getValue(path), fieldAtPath(input.fields, path), input.translate);
};

const idOf = (value: unknown): number | string | undefined => {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  if (value && typeof value === "object" && "id" in value) {
    const { id } = value as { id: unknown };
    return typeof id === "string" || typeof id === "number" ? id : undefined;
  }
  return undefined;
};

/** An upload field's value as something a thumbnail can be made from. */
export const mediaOf = (value: unknown, field: AnyField | undefined): PreviewMedia | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const relationTo = field?.relationTo;
  // Polymorphic upload: { relationTo, value }
  if (typeof value === "object" && value !== null && "relationTo" in value && "value" in value) {
    const poly = value as { relationTo: string; value: unknown };
    const id = idOf(poly.value);
    return id === undefined ? undefined : { kind: "doc", relationTo: poly.relationTo, id };
  }
  if (typeof value === "object" && value !== null && "url" in value) {
    const doc = value as { url?: unknown; sizes?: { thumbnail?: { url?: unknown } } };
    const url = doc.sizes?.thumbnail?.url ?? doc.url;
    if (typeof url === "string" && url) {
      return { kind: "url", url };
    }
  }
  const id = idOf(value);
  if (id === undefined || typeof relationTo !== "string") {
    return undefined;
  }
  return { kind: "doc", relationTo, id };
};

const TITLE_FALLBACK_TYPES = new Set(["richText"]);

/**
 * The card of a row: `select` paths where given, otherwise the defaults —
 * title = the block name, else the first text-like field with a value (rich text as a last
 * resort); subtitle = the block or item label; media = the first upload field into an image
 * collection. A missing value falls through to the default, an empty title leaves it undefined
 * (the caller shows its own label then).
 */
export const resolvePreview = (input: PreviewInput): Preview => {
  const { fields, select = {}, translate } = input;
  const named = topLevelFields(fields).filter((field) => !(field.admin?.hidden || field.hidden));

  let title: string | undefined;
  if (input.withBlockName) {
    title = valueToText(input.getValue("blockName"), undefined, translate);
  }
  if (!title && select.title) {
    title = selectedText(input, select.title);
  }
  if (!title) {
    for (const field of named) {
      if (TEXT_TYPES.has(field.type) && field.name) {
        title = valueToText(input.getValue(field.name), field, translate);
        if (title) {
          break;
        }
      }
    }
  }
  if (!title) {
    for (const field of named) {
      if (TITLE_FALLBACK_TYPES.has(field.type) && field.name) {
        title = valueToText(input.getValue(field.name), field, translate);
        if (title) {
          break;
        }
      }
    }
  }

  const subtitle =
    (select.subtitle ? selectedText(input, select.subtitle) : undefined) ?? input.kindLabel;

  let media: PreviewMedia | undefined;
  if (select.media) {
    media = mediaOf(input.getValue(select.media), fieldAtPath(fields, select.media));
  } else {
    const upload = named.find(
      (field) =>
        field.type === "upload" &&
        typeof field.relationTo === "string" &&
        (input.isImageCollection?.(field.relationTo) ?? true)
    );
    if (upload?.name) {
      media = mediaOf(input.getValue(upload.name), upload);
    }
  }

  return {
    ...(title ? { title } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(media ? { media } : {}),
  };
};
