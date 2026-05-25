import type { GlobalFieldLabelRegistry } from "../../../types";

interface Props {
  registry: GlobalFieldLabelRegistry;
  collectionSlug?: string;
  documentId?: number;
  globalSlug?: string;
  fieldPath: string;
}

export function resolveFieldLabel({
  registry,
  collectionSlug,
  documentId,
  globalSlug,
  fieldPath,
}: Props) {
  const segments =
    registry[collectionSlug ?? globalSlug ?? ""]?.[documentId ?? 0]?.[
      fieldPath
    ];

  if (!segments) {return fieldPath;}

  return segments
    .map((s) => (s.type === "field" ? s.label : `#${s.position + 1}`))
    .join(" > ");
}
