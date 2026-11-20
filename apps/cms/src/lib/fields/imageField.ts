import type { GroupField, UploadField } from "payload";

import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";

const aspectRatioOptions = [
  { label: { en: "Wide (16:9)", es: "Panorámica (16:9)" }, value: "16/9" },
  { label: { en: "Landscape (3:2)", es: "Horizontal (3:2)" }, value: "3/2" },
  { label: { en: "Classic (4:3)", es: "Clásica (4:3)" }, value: "4/3" },
  { label: { en: "Square (1:1)", es: "Cuadrada (1:1)" }, value: "1/1" },
  { label: { en: "Tall (9:16)", es: "Vertical (9:16)" }, value: "9/16" },
  { label: { en: "Portrait (1:2)", es: "Retrato (1:2)" }, value: "1/2" },
  { label: { en: "Banner (4:1)", es: "Banner (4:1)" }, value: "4/1" },
  { label: { en: "Strip (3:1)", es: "Franja (3:1)" }, value: "3/1" },
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
    label: { en: "Image file", es: "Archivo de imagen" },
    name: "image",
    relationTo: "media",
    required,
    type: "upload",
    ...(withDefaultMedia
      ? {
          defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
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
                label: { en: "Image shape", es: "Forma de la imagen" },
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
