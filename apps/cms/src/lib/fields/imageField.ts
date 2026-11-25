import type { GroupField, UploadField } from "payload";

import { getDefaultMediaId } from "@/dal/getDefaultMediaId";

/**
 * The crops editors actually need. Stored values stay the CSS `aspect-ratio` strings the
 * frontend understands (`ImageAspectRatio`); removed ratios (9/16, 1/2, 4/1, 3/1) were migrated
 * to the nearest kept one in `20261125_163100_editor_friendly_choices`; the portrait 3/4 shape came
 * back in `20261125_163200_standard_link_field`.
 */
const aspectRatioOptions = [
  { label: { en: "Wide (16:9)", es: "Panorámica (16:9)" }, value: "16/9" },
  { label: { en: "Landscape (3:2)", es: "Horizontal (3:2)" }, value: "3/2" },
  { label: { en: "Classic (4:3)", es: "Clásica (4:3)" }, value: "4/3" },
  { label: { en: "Square (1:1)", es: "Cuadrada (1:1)" }, value: "1/1" },
  { label: { en: "Portrait (3:4)", es: "Vertical (3:4)" }, value: "3/4" },
  { label: { en: "Original shape", es: "Forma original" }, value: "auto" },
];

export function imageField(
  name = "image",
  {
    withDefaultMedia = false,
    required = true,
    withAspectRatio = true,
    hideAspectRatio = false,
  }: {
    withDefaultMedia?: boolean;
    required?: boolean;
    withAspectRatio?: boolean;
    /** Keeps the stored shape but hides the choice, where the component draws the image its own way. */
    hideAspectRatio?: boolean;
  } = {}
): GroupField {
  const imageUpload: UploadField = {
    label: { en: "Image file", es: "Archivo de imagen" },
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
              { ...imageUpload, admin: { width: hideAspectRatio ? "100%" : "50%" } },
              {
                admin: { hidden: hideAspectRatio, width: "50%" },
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
