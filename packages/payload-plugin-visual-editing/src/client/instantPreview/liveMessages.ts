import type {
  VeFieldPatchMessage,
  VeFieldSnapshotMessage,
  VeLiveDocument,
  VeRichTextStructureMessage,
} from "../../shared/protocol.js";
import type { PlainObject } from "../../shared/plainObject.js";

import {
  VE_ANNOUNCE_REQUEST_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_RICH_TEXT_STRUCTURE_TYPE,
} from "../../shared/protocol.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { isVeDocument } from "../../shared/veDocument.js";

const isOptionalString = (value: unknown) => value === undefined || typeof value === "string";

const hasStrings = (entry: unknown, keys: readonly string[]) =>
  isPlainObject(entry) && keys.every((key) => typeof entry[key] === "string");

const addressesDocument = (message: PlainObject) =>
  isVeDocument(message) && isOptionalString(message.locale);

const hasEntries = (entries: unknown, keys: readonly string[]) =>
  Array.isArray(entries) && entries.every((entry) => hasStrings(entry, keys));

export const isAnnounceRequest = (data: unknown): boolean =>
  isPlainObject(data) && data.type === VE_ANNOUNCE_REQUEST_TYPE;

export const readFieldSnapshot = (data: unknown): VeFieldSnapshotMessage | null => {
  if (!isPlainObject(data) || data.type !== VE_FIELD_SNAPSHOT_TYPE) return null;
  if (!addressesDocument(data)) return null;
  if (!hasEntries(data.fields, ["key", "saved", "value"])) return null;
  return data as VeFieldSnapshotMessage;
};

export const readFieldPatches = (data: unknown): VeFieldPatchMessage | null => {
  if (!isPlainObject(data) || data.type !== VE_FIELD_PATCH_TYPE) return null;
  if (!addressesDocument(data)) return null;
  if (!hasEntries(data.patches, ["key", "value"])) return null;
  return data as VeFieldPatchMessage;
};

export const readRichTextStructure = (data: unknown): VeRichTextStructureMessage | null => {
  if (!isPlainObject(data) || data.type !== VE_RICH_TEXT_STRUCTURE_TYPE) return null;
  if (!addressesDocument(data) || !hasStrings(data, ["key", "shape"])) return null;
  if (data.state !== null && !isPlainObject(data.state)) return null;
  return data as VeRichTextStructureMessage;
};

export const isForAnotherLocale = (message: VeLiveDocument, pageLocale: string | undefined) =>
  Boolean(message.locale && pageLocale && message.locale !== pageLocale);
