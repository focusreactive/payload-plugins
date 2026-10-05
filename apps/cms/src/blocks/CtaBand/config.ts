import type { Block, Field, GroupField } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { link } from "@/lib/fields/link";

const fields: Field[] = [
  ...sectionHeaderFields({
    eyebrowDefault: { en: "Get started" },
    headingDefault: { en: "Start shipping in rhythm." },
  }),
  {
    admin: {
      components: { RowLabel: "@/components/admin/RowLabel#RowLabel" },
      initCollapsed: true,
    },
    fields: (link() as GroupField).fields,
    label: "Actions",
    localized: true,
    maxRows: 2,
    minRows: 1,
    name: "actions",
    required: true,
    type: "array",
  },
];

export const CtaBandBlock: Block = injectSection({
  slug: "ctaBand",
  interfaceName: "CtaBandBlock",
  ...getBlockPreviewImage("CTA Band"),
  labels: {
    plural: "CTA Bands",
    singular: "CTA Band",
  },
  fields,
});
