import type { GroupField, UploadField } from "payload";

import { getDefaultMediaId } from "@/dal/getDefaultMediaId";

/**
 * The crops editors actually need. Stored values stay the CSS `aspect-ratio` strings the
 * frontend understands (`ImageAspectRatio`); removed ratios (9/16, 1/2, 4/1, 3/1) were migrated
 * to the nearest kept one in `20261120_123232_editor_friendly_choices`.
 */
const aspectRatioOptions = [
  { label: { en: "Widescreen (16:9)", es: "Panorámica (16:9)" }, value: "16/9" },
  { label: { en: "Photo (3:2)", es: "Foto (3:2)" }, value: "3/2" },
  { label: { en: "Standard (4:3)", es: "Estándar (4:3)" }, value: "4/3" },
  { label: { en: "Square (1:1)", es: "Cuadrada (1:1)" }, value: "1/1" },
  { label: { en: "Original shape", es: "Forma original" }, value: "auto" },
];

export function imageField(
  name = "image",
  {
    withDefaultMedia = false,
    required = true,
    withAspectRatio = true,
  }: { withDefaultMedia?: boolean; required?: boolean; withAspectRatio?: boolean } = {}
): GroupField {
  const imageUpload: UploadField = {
    label: { en: "Image File", es: "Archivo de imagen" },
    name: "image",
    relationTo: "media",
    required,
    type: "upload",
    ...(withDefaultMedia
      ? {
          defaultValue: async () => getDefaultMediaId(),
        }
      : {}),
  };

  return {
    fields: withAspectRatio
      ? [
          {
            fields: [
              { ...imageUpload, admin: { width: "50%" } },
              {
                admin: { width: "50%" },
                defaultValue: "1/1",
                label: { en: "Aspect Ratio", es: "Relación de aspecto" },
                name: "aspectRatio",
                options: aspectRatioOptions,
                type: "select",
              },
            ],
            type: "row",
          },
        ]
      : [imageUpload],
    label: { en: "Image", es: "Imagen" },
    name,
    type: "group",
  };
}
