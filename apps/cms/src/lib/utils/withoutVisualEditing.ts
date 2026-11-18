import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

const VISUAL_EDITING_META_KEY = "_meta";

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const withoutMeta = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutMeta);
  if (!isPlainObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== VISUAL_EDITING_META_KEY)
      .map(([key, child]) => [key, withoutMeta(child)])
  );
};

export const withoutVisualEditing = <Value>(value: Value): Value =>
  withoutMeta(stripMarkers(value)) as Value;
