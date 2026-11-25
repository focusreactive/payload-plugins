import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";
import { buttonsField } from "@/lib/fields/link";

const fields: Field[] = [
  sectionHeadingField({
    title: { en: "Get started", es: "Empieza ahora" },
    description: { en: "Start shipping in rhythm.", es: "Empieza a publicar con ritmo." },
  }),
  buttonsField({ maxRows: 2, minRows: 1 }),
];

export const CtaBandBlock: Block = injectSection({
  slug: "ctaBand",
  interfaceName: "CtaBandBlock",
  ...getBlockPreviewImage("CTA Band"),
  labels: {
    plural: { en: "Calls to action", es: "Llamadas a la acción" },
    singular: { en: "Call to action", es: "Llamada a la acción" },
  },
  fields,
});
