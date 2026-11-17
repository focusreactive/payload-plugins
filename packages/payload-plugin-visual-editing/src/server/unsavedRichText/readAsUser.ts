import type { Payload, SelectType } from "payload";

import type { LiveRichTextField, VeEditorState } from "../../shared/protocol.js";
import type { Unsaved, User } from "./postedRequest.js";
import type { SavedReferencesOnly, UnsavedRichText } from "./readContext.js";

import { FIELD_PATH_SEPARATOR, valueAtKey } from "../../shared/fieldKey.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { rootOf } from "../../shared/richText/editorNodes.js";
import { shapeOf } from "../../shared/richText/shapeOf.js";
import { isMetaInfo, META_KEY } from "../../shared/shared.js";
import { documentAddressOf, keyedFieldAddressOf } from "../../shared/veDocument.js";
import { SAVED_REFERENCES_ONLY_CONTEXT_KEY, UNSAVED_RICH_TEXT_CONTEXT_KEY } from "./readContext.js";
import { withHeldReferences } from "./savedReferences.js";

export type UnsavedRichTextDepth = number | ((field: LiveRichTextField) => number | undefined);

export type ReadAsUserOptions = {
  depth: UnsavedRichTextDepth | undefined;
  readWholeDocument: boolean;
  savedReferencesOnly: boolean;
};

const SAVED_READ = "saved";
const UNSAVED_READ = "unsaved";

const depthOf = (depth: UnsavedRichTextDepth | undefined, field: LiveRichTextField) =>
  typeof depth === "function" ? depth(field) : depth;

const selectOf = (fieldPath: string): SelectType => ({
  [fieldPath.split(FIELD_PATH_SEPARATOR)[0] ?? fieldPath]: true,
});

const placementOf = (field: LiveRichTextField, state: VeEditorState | null) =>
  state === null ? null : { field, isPlaced: false, state };

const readDocumentAs = (
  user: User,
  payload: Payload,
  { document, field, fieldPath, locale, state }: Unsaved,
  { depth, readWholeDocument, savedReferencesOnly }: ReadAsUserOptions
): {
  placed: UnsavedRichText | null;
  read: Promise<unknown>;
  restricted: SavedReferencesOnly | null;
} => {
  const placed = placementOf(field, state);
  const restricted = savedReferencesOnly ? { field, isApplied: false } : null;
  const options = {
    context: {
      ...(placed && { [UNSAVED_RICH_TEXT_CONTEXT_KEY]: placed }),
      ...(restricted && { [SAVED_REFERENCES_ONLY_CONTEXT_KEY]: restricted }),
      visualEditing: true,
    },
    depth: depthOf(depth, field),
    disableErrors: true,
    draft: true,
    locale,
    overrideAccess: false,
    ...(!readWholeDocument && { select: selectOf(fieldPath) }),
    user,
  };
  const read =
    document.kind === "global"
      ? payload.findGlobal({ ...options, slug: document.slug })
      : payload.findByID({ ...options, collection: document.collection, id: document.id });
  return { placed, read, restricted };
};

const isMarkedRichText = (content: unknown): boolean =>
  isPlainObject(content) && isMetaInfo(content[META_KEY]) && rootOf(content) !== null;

const hasStructureOf = (content: unknown, field: LiveRichTextField, state: VeEditorState) => {
  const fieldAddress = keyedFieldAddressOf(field);
  const shape = shapeOf(content, fieldAddress);
  return shape !== null && shape === shapeOf(state, fieldAddress);
};

const isAnswerTo = (content: unknown, { field, state }: Unsaved): boolean =>
  isMarkedRichText(content) && (state === null || hasStructureOf(content, field, state));

const readTargetOf = ({ field, fieldPath, state }: Unsaved) =>
  state === null
    ? [SAVED_READ, keyedFieldAddressOf(field)]
    : [UNSAVED_READ, documentAddressOf(field), fieldPath];

export const readKeyOf = (user: NonNullable<User>, unsaved: Unsaved): string =>
  JSON.stringify([user.collection, user.id, unsaved.locale ?? null, ...readTargetOf(unsaved)]);

export const readAsUser = async <Content>(
  payload: Payload,
  user: NonNullable<User>,
  unsaved: Unsaved,
  options: ReadAsUserOptions
): Promise<Content | null> => {
  const { placed, read, restricted } = readDocumentAs(user, payload, unsaved, options);
  const document = await read;
  if (placed && !placed.isPlaced) return null;
  if (restricted && !restricted.isApplied) return null;

  const content = valueAtKey(document, unsaved.field.key)?.value;
  if (!isAnswerTo(content, unsaved)) return null;
  return (restricted ? withHeldReferences(content) : content) as Content;
};
