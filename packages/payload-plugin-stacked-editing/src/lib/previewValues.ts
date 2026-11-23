import type { AnyField } from "./fieldLookup.js";
import type { Translate } from "./labels.js";

export type PreviewMedia =
  | { kind: "doc"; relationTo: string; id: number | string }
  | { kind: "url"; url: string };

const MAX_PREVIEW_TEXT_LENGTH = 120;

const truncateText = (text: string): string =>
  text.length > MAX_PREVIEW_TEXT_LENGTH
    ? `${text.slice(0, MAX_PREVIEW_TEXT_LENGTH - 1).trimEnd()}…`
    : text;

type LexicalNode = { text?: unknown; children?: unknown; type?: unknown };

const plainTextOf = (node: LexicalNode): string => {
  if (typeof node.text === "string") {
    return node.text;
  }
  if (node.type === "linebreak") {
    return " ";
  }
  return Array.isArray(node.children)
    ? (node.children as LexicalNode[]).map(plainTextOf).join("")
    : "";
};

export const richTextToPlain = (value: unknown): string | undefined => {
  const root = (value as { root?: LexicalNode } | null | undefined)?.root;
  if (!root || !Array.isArray(root.children)) {
    return undefined;
  }
  for (const block of root.children as LexicalNode[]) {
    const text = plainTextOf(block).replaceAll(/\s+/gu, " ").trim();
    if (text) {
      return truncateText(text);
    }
  }
  return undefined;
};

export const isEditorState = (value: unknown): boolean =>
  typeof value === "object" && value !== null && "root" in value;

const optionLabel = (field: AnyField | undefined, value: string, translate: Translate): string => {
  const option = field?.options?.find((candidate) =>
    typeof candidate === "string" ? candidate === value : candidate.value === value
  );
  if (option && typeof option === "object") {
    return translate(option.label) || value;
  }
  return value;
};

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
      return truncateText(optionLabel(field, trimmed, translate));
    }
    if (field?.type === "date") {
      const date = new Date(trimmed);
      return Number.isNaN(date.getTime()) ? trimmed : date.toLocaleDateString();
    }
    return truncateText(trimmed);
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    const labels = (value as string[]).map((item) => optionLabel(field, item, translate));
    return labels.length > 0 ? truncateText(labels.join(", ")) : undefined;
  }
  if (isEditorState(value)) {
    return richTextToPlain(value);
  }
  return undefined;
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

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const polymorphicMediaOf = (value: Record<string, unknown>): PreviewMedia | undefined => {
  const id = idOf(value.value);
  return id === undefined || typeof value.relationTo !== "string"
    ? undefined
    : { kind: "doc", relationTo: value.relationTo, id };
};

const populatedUrlOf = (value: Record<string, unknown>): string | undefined => {
  const doc = value as { url?: unknown; sizes?: { thumbnail?: { url?: unknown } } };
  const url = doc.sizes?.thumbnail?.url ?? doc.url;
  return typeof url === "string" && url ? url : undefined;
};

export const mediaOf = (value: unknown, field: AnyField | undefined): PreviewMedia | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (isObject(value) && "relationTo" in value && "value" in value) {
    return polymorphicMediaOf(value);
  }
  const url = isObject(value) && "url" in value ? populatedUrlOf(value) : undefined;
  if (url) {
    return { kind: "url", url };
  }
  const id = idOf(value);
  const relationTo = field?.relationTo;
  return id === undefined || typeof relationTo !== "string"
    ? undefined
    : { kind: "doc", relationTo, id };
};
