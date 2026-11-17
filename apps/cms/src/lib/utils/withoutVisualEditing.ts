import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

// The plugin keeps the identity of uploads, relationships and rich text in `_meta`, which
// `stripMarkers` leaves in place on purpose.
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

/**
 * Returns a copy of a draft read with nothing left for visual editing to target: no text markers
 * and no `_meta`. Use it where a separate document (a header, a footer) is rendered inside the
 * document being edited, so only the edited document's own fields are editable in its preview.
 */
export const withoutVisualEditing = <Value>(value: Value): Value =>
  withoutMeta(stripMarkers(value)) as Value;
