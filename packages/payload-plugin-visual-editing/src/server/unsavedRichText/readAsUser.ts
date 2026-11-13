import type { Payload } from "payload";

import type { LiveRichTextField } from "../../shared/protocol.js";
import type { Unsaved, User } from "./postedRequest.js";
import type { UnsavedRichText } from "./readContext.js";

import { valueAtKey } from "../../shared/fieldKey.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { shapeOf } from "../../shared/richText/shapeOf.js";
import { isMetaInfo, META_KEY } from "../../shared/shared.js";
import { documentAddressOf, keyedFieldAddressOf } from "../../shared/veDocument.js";
import { UNSAVED_RICH_TEXT_CONTEXT_KEY } from "./readContext.js";

export type UnsavedRichTextDepth = number | ((field: LiveRichTextField) => number | undefined);

const depthOf = (depth: UnsavedRichTextDepth | undefined, field: LiveRichTextField) =>
  typeof depth === "function" ? depth(field) : depth;

const readDocumentAs = (
  user: User,
  payload: Payload,
  { document, field, locale, state }: Unsaved,
  depth: UnsavedRichTextDepth | undefined
): { placed: UnsavedRichText; read: Promise<unknown> } => {
  const placed: UnsavedRichText = { field, isPlaced: false, state };
  const options = {
    context: { [UNSAVED_RICH_TEXT_CONTEXT_KEY]: placed, visualEditing: true },
    depth: depthOf(depth, field),
    disableErrors: true,
    draft: true,
    locale,
    overrideAccess: false,
    user,
  };
  const read =
    document.kind === "global"
      ? payload.findGlobal({ ...options, slug: document.slug })
      : payload.findByID({ ...options, collection: document.collection, id: document.id });
  return { placed, read };
};

const hasStructureOf = (content: unknown, { field, state }: Unsaved): boolean => {
  if (!isPlainObject(content) || !isMetaInfo(content[META_KEY])) return false;
  const fieldAddress = keyedFieldAddressOf(field);
  const shape = shapeOf(content, fieldAddress);
  return shape !== null && shape === shapeOf(state, fieldAddress);
};

export const readKeyOf = (user: NonNullable<User>, { field, fieldPath, locale }: Unsaved): string =>
  JSON.stringify([user.collection, user.id, documentAddressOf(field), fieldPath, locale ?? null]);

export const readAsUser = async <Content>(
  payload: Payload,
  user: NonNullable<User>,
  unsaved: Unsaved,
  depth: UnsavedRichTextDepth | undefined
): Promise<Content | null> => {
  const { placed, read } = readDocumentAs(user, payload, unsaved, depth);
  const document = await read;
  if (!placed.isPlaced) return null;

  const content = valueAtKey(document, unsaved.field.key)?.value;
  return hasStructureOf(content, unsaved) ? (content as Content) : null;
};
