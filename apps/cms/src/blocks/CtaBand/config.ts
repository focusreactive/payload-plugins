import type { Block, Field, GroupField } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/fields/section/injectSection";
import { sectionHeaderFields } from "@/fields/sectionHeader/sectionHeaderFields";
import { link } from "@/fields/link";

const fields: Field[] = [
  ...sectionHeaderFields({
    eyebrowDefault: { en: "Get started", es: "Empieza ahora" },
    headingDefault: { en: "Start shipping in rhythm.", es: "Empieza a publicar con ritmo." },
  }),
  {
    admin: {
      components: { RowLabel: "@/components/admin/RowLabel#RowLabel" },
      initCollapsed: true,
    },
    fields: (link() as GroupField).fields,
    label: { en: "Actions", es: "Acciones" },
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
    plural: { en: "CTA Bands", es: "Bandas CTA" },
    singular: { en: "CTA Band", es: "Banda CTA" },
  },
  fields,
});
