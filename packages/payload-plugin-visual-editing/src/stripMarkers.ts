import { META_KEY } from "./shared/shared.js";
import { withoutMarker } from "./shared/stegaText.js";

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const withoutMarkers = (value: unknown): unknown => {
  if (typeof value === "string") return withoutMarker(value);
  if (Array.isArray(value)) return value.map(withoutMarkers);
  if (!isJsonObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === META_KEY ? child : withoutMarkers(child),
    ])
  );
};

export const stripMarkers = <Value>(value: Value): Value => withoutMarkers(value) as Value;
