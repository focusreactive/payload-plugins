import type { LiveRichTextField } from "../../shared/protocol.js";

import { fieldKeyOfMarker } from "../../shared/fieldKey.js";
import { isRichTextNodeKey } from "../../shared/richText/nodeKey.js";
import { shapeOf } from "../../shared/richText/shapeOf.js";
import { isMetaInfo, META_KEY } from "../../shared/shared.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { keyedFieldAddressOf, veDocumentOf } from "../../shared/veDocument.js";

export type LiveRichTextIdentity = { field: LiveRichTextField; shape: string };

export const liveRichTextOf = (value: unknown): LiveRichTextIdentity | null => {
  const meta = isPlainObject(value) ? value[META_KEY] : undefined;
  if (!isMetaInfo(meta) || meta.locale !== undefined) return null;

  const key = fieldKeyOfMarker(meta);
  if (key === null || isRichTextNodeKey(key)) return null;

  const field: LiveRichTextField = { ...veDocumentOf(meta), key };
  const shape = shapeOf(value, keyedFieldAddressOf(field));
  return shape === null ? null : { field, shape };
};
