import type { GlobalFieldLabelRegistry } from "../../../types";

export function resolveLabel(
  registry: GlobalFieldLabelRegistry,
  collectionSlug: string,
  documentId: number,
  fieldPath: string,
) {
  const segments = registry[collectionSlug]?.[documentId]?.[fieldPath];

  if (!segments) return fieldPath;

  return segments.map((s) => (s.type === "field" ? s.label : `#${s.position + 1}`)).join(" > ");
}
