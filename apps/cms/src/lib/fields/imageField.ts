import type { GroupField } from "payload";

import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";

const aspectRatioOptions = [
  { label: "16/9", value: "16/9" },
  { label: "3/2", value: "3/2" },
  { label: "4/3", value: "4/3" },
  { label: "1/1", value: "1/1" },
  { label: "9/16", value: "9/16" },
  { label: "1/2", value: "1/2" },
  { label: "4/1", value: "4/1" },
  { label: "3/1", value: "3/1" },
  { label: "Auto", value: "auto" },
];

export function imageField(
  name = "image",
  {
    withDefaultMedia = false,
    required = true,
    withAspectRatio = true,
  }: { withDefaultMedia?: boolean; required?: boolean; withAspectRatio?: boolean } = {}
): GroupField {
  return {
    fields: [
      {
        label: "Image File",
        name: "image",
        relationTo: "media",
        required,
        type: "upload",
        ...(withDefaultMedia
          ? {
              defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
            }
          : {}),
      },
      ...(withAspectRatio
        ? [
            {
              defaultValue: "1/1",
              label: "Aspect Ratio",
              name: "aspectRatio",
              options: aspectRatioOptions,
              type: "select" as const,
            },
          ]
        : []),
    ],
    label: "Image",
    name,
    type: "group",
  };
}
