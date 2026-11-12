import { vercelStegaDecodeAll } from "@vercel/stega";

import type { VeIdentity } from "../../src/shared/shared";

import { isPlainObject } from "../../src/shared/plainObject";
import { toRichTextNodeMarker } from "../../src/shared/richText/nodeKey";
import { META_KEY, veIdentityOf } from "../../src/shared/shared";
import { withMarker } from "../../src/shared/stegaText";

const DATA_PATH_SEPARATOR = ".";

const childOf = (value: unknown, segment: string): unknown => {
  if (Array.isArray(value)) return value[Number(segment)];
  return isPlainObject(value) ? value[segment] : undefined;
};

export const valueAt = (data: unknown, dataPath: string): unknown =>
  dataPath.split(DATA_PATH_SEPARATOR).reduce(childOf, data);

export const markersAt = (data: unknown, dataPath: string): unknown[] => {
  const value = valueAt(data, dataPath);
  return typeof value === "string" ? (vercelStegaDecodeAll(value) ?? []) : [];
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
  withMarker(text, veIdentityOf(identity));

export const markedTextNode = (text: string, address: string, shape: string): string =>
  withMarker(text, toRichTextNodeMarker(address, shape));
