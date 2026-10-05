import type { Block, Field, GroupField } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedRichText } from "@/lib/utils/createLocalizedDefault";
import { generateRichText } from "@/lib/utils/generateRichText";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/lib/fields/link";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

const fields: Field[] = [
  ...sectionHeaderFields({ headingDefault: DEFAULT_VALUES.blocks.content.heading }),
  {
    defaultValue: "image-text",
    label: "Layout",
    name: "layout",
    options: [
      {
        label: "50/50 Image + Text",
        value: "image-text",
      },
      {
        label: "50/50 Text + Image",
        value: "text-image",
      },
    ],
    required: true,
    type: "select",
  },
  {
    defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
    label: "Image",
    admin: {
      description:
        "Optional. Without an image the section is a single prose column with the heading in a side rail.",
    },
    name: "image",
    relationTo: "media",
    type: "upload",
  },
  {
    defaultValue: createLocalizedRichText(DEFAULT_VALUES.richText.content),
    editor: generateRichText(),
    label: "Content",
    localized: true,
    name: "content",
    required: true,
    type: "richText",
  },
  {
    admin: {
      components: { RowLabel: "@/components/admin/RowLabel#RowLabel" },
      initCollapsed: true,
    },
    fields: (link() as GroupField).fields,
    label: "Actions",
    localized: true,
    maxRows: 2,
    name: "actions",
    type: "array",
  },
];

export const ContentBlock: Block = injectSection({
  slug: "content",
  interfaceName: "ContentBlock",
  ...getBlockPreviewImage("Content Section"),
  labels: {
    plural: "Content Sections",
    singular: "Content Section",
  },
  fields,
});
