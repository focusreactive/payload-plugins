import type { Payload } from "payload";

import type { FieldStep } from "../../shared/fieldKey.js";
import type { PlainObject } from "../../shared/plainObject.js";
import type { VeRichTextFormats } from "../../shared/richText/formats.js";
import type { DocumentToRead } from "../unsavedRichText/postedRequest.js";

import { isPlainObject } from "../../shared/plainObject.js";
import {
  BOLD_FORMAT,
  BULLET_LIST,
  CHECK_LIST,
  CODE_FORMAT,
  HEADING_TAGS,
  ITALIC_FORMAT,
  NUMBERED_LIST,
  STRIKETHROUGH_FORMAT,
  SUBSCRIPT_FORMAT,
  SUPERSCRIPT_FORMAT,
  UNDERLINE_FORMAT,
} from "../../shared/richText/formats.js";

type Features = ReadonlyMap<unknown, unknown>;

const TEXT_FORMAT_OF_FEATURE: Readonly<Record<string, number>> = {
  bold: BOLD_FORMAT,
  inlineCode: CODE_FORMAT,
  italic: ITALIC_FORMAT,
  strikethrough: STRIKETHROUGH_FORMAT,
  subscript: SUBSCRIPT_FORMAT,
  superscript: SUPERSCRIPT_FORMAT,
  underline: UNDERLINE_FORMAT,
};

const LIST_OF_FEATURE: Readonly<Record<string, string>> = {
  checklist: CHECK_LIST,
  orderedList: NUMBERED_LIST,
  unorderedList: BULLET_LIST,
};

const HEADING_FEATURE = "heading";
const LINK_FEATURE = "link";
const QUOTE_FEATURE = "blockquote";
const BLOCKS_FIELD_TYPE = "blocks";

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const fieldsOfEntity = (payload: Payload, document: DocumentToRead): unknown[] => {
  const entity =
    document.kind === "global"
      ? payload.config.globals.find(({ slug }) => slug === document.slug)
      : payload.collections[document.collection]?.config;
  return listOf(entity?.flattenedFields);
};

const blockOf = (payload: Payload, field: PlainObject, blockType: string): unknown => {
  const blocks = [...listOf(field.blockReferences), ...listOf(field.blocks)].map((block) =>
    typeof block === "string" ? payload.blocks[block] : block
  );
  return blocks.find((block) => isPlainObject(block) && block.slug === blockType);
};

const fieldsOfRow = (payload: Payload, field: PlainObject, blockType: string | undefined) => {
  if (field.type !== BLOCKS_FIELD_TYPE) return listOf(field.flattenedFields);
  const block = blockType === undefined ? undefined : blockOf(payload, field, blockType);
  return isPlainObject(block) ? listOf(block.flattenedFields) : [];
};

const fieldAt = (
  payload: Payload,
  document: DocumentToRead,
  steps: readonly FieldStep[]
): PlainObject | null => {
  let fields = fieldsOfEntity(payload, document);
  let field: PlainObject | null = null;
  for (const step of steps) {
    if ("name" in step) {
      const named = fields.find(
        (candidate) => isPlainObject(candidate) && candidate.name === step.name
      );
      if (!isPlainObject(named)) return null;
      field = named;
      fields = listOf(named.flattenedFields);
    } else if (field) {
      fields = fieldsOfRow(payload, field, step.blockType);
    }
  }
  return field;
};

const featuresOf = (field: PlainObject): Features | null => {
  const editorConfig = isPlainObject(field.editor) ? field.editor.editorConfig : undefined;
  const features = isPlainObject(editorConfig) ? editorConfig.resolvedFeatureMap : undefined;
  return features instanceof Map ? features : null;
};

const headingsOf = (features: Features): string[] => {
  const heading = features.get(HEADING_FEATURE);
  if (!isPlainObject(heading)) return [];
  const props = heading.sanitizedServerFeatureProps;
  const enabled = isPlainObject(props) ? props.enabledHeadingSizes : undefined;
  return Array.isArray(enabled)
    ? HEADING_TAGS.filter((tag) => enabled.includes(tag))
    : [...HEADING_TAGS];
};

const formatsOf = (features: Features): VeRichTextFormats => ({
  hasLinks: features.has(LINK_FEATURE),
  hasQuotes: features.has(QUOTE_FEATURE),
  headings: headingsOf(features),
  lists: Object.keys(LIST_OF_FEATURE).flatMap((feature) =>
    features.has(feature) ? (LIST_OF_FEATURE[feature] ?? []) : []
  ),
  textFormats: Object.keys(TEXT_FORMAT_OF_FEATURE).reduce(
    (formats, feature) =>
      features.has(feature) ? formats | (TEXT_FORMAT_OF_FEATURE[feature] ?? 0) : formats,
    0
  ),
});

export const formatsOfField = (
  payload: Payload,
  document: DocumentToRead,
  steps: readonly FieldStep[]
): VeRichTextFormats | null => {
  const field = fieldAt(payload, document, steps);
  const features = field && featuresOf(field);
  return features ? formatsOf(features) : null;
};
