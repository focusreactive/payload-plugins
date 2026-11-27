import { vercelStegaDecode, vercelStegaDecodeAll } from "@vercel/stega";

import type { VeIdentity } from "../../src/shared/shared";

import { isPlainObject } from "../../src/shared/plainObject";
import { fromRichTextNodeMarker, toRichTextNodeMarker } from "../../src/shared/richText/nodeKey";
import { fromStegaPayload, META_KEY, toStegaPayload } from "../../src/shared/shared";
import { leadingWhitespaceOf, withMarker } from "../../src/shared/stegaText";

const DATA_PATH_SEPARATOR = ".";

const childOf = (value: unknown, segment: string): unknown => {
  if (Array.isArray(value)) return value[Number(segment)];
  return isPlainObject(value) ? value[segment] : undefined;
};

export const valueAt = (data: unknown, dataPath: string): unknown =>
  dataPath.split(DATA_PATH_SEPARATOR).reduce(childOf, data);

const markerOfPayload = (payload: unknown): unknown =>
  fromStegaPayload(payload) ?? fromRichTextNodeMarker(payload) ?? payload;

export const markerIn = (text: unknown): unknown =>
  markerOfPayload(vercelStegaDecode(String(text)));

export const markersIn = (text: string): unknown[] =>
  (vercelStegaDecodeAll(text) ?? []).map(markerOfPayload);

export const markersAt = (data: unknown, dataPath: string): unknown[] => {
  const value = valueAt(data, dataPath);
  return typeof value === "string" ? markersIn(value) : [];
};

export const metaAt = (data: unknown, dataPath: string): unknown =>
  childOf(valueAt(data, dataPath), META_KEY);

export type FoundMeta = { dataPath: string; meta: unknown };

export const everyMetaIn = (data: unknown, dataPath = ""): FoundMeta[] => {
  if (Array.isArray(data)) {
    return data.flatMap((item, index) => everyMetaIn(item, `${dataPath}.${index}`));
  }
  if (!isPlainObject(data)) return [];
  return Object.entries(data).flatMap(([property, value]) =>
    property === META_KEY
      ? [{ dataPath, meta: value }]
      : everyMetaIn(value, dataPath ? `${dataPath}.${property}` : property)
  );
};

export const everyMarkedTextIn = (data: unknown): string[] => {
  if (typeof data === "string") return (vercelStegaDecodeAll(data) ?? []).length > 0 ? [data] : [];
  if (Array.isArray(data)) return data.flatMap(everyMarkedTextIn);
  return isPlainObject(data) ? Object.values(data).flatMap(everyMarkedTextIn) : [];
};

export const markedText = (text: string, identity: VeIdentity): string =>
  withMarker(text, toStegaPayload(identity, leadingWhitespaceOf(text).length));

export const markedTextNode = (text: string, address: string, shape: string): string =>
  withMarker(text, toRichTextNodeMarker(address, shape));
