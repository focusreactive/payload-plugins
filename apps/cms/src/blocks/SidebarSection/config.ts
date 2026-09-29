import type { Block, Field, GroupField } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedRichText } from "@/lib/utils/createLocalizedDefault";
import { generateRichText } from "@/lib/utils/generateRichText";
import { link } from "@/lib/fields/link";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

const fields: Field[] = [
  ...sectionHeaderFields({
    headingDefault: { en: "Section heading", es: "Encabezado de sección" },
  }),
  {
    defaultValue: createLocalizedRichText(DEFAULT_VALUES.richText.text),
    editor: generateRichText(),
    label: {
      en: "Body",
      es: "Cuerpo",
    },
    localized: true,
    name: "body",
    required: true,
    type: "richText",
  },
  {
    label: {
      en: "Sidebar heading",
      es: "Encabezado de la barra lateral",
    },
    localized: true,
    name: "sidebarHeading",
    type: "text",
  },
  {
    admin: {
      components: { RowLabel: "@/components/admin/RowLabel#RowLabel" },
      initCollapsed: true,
    },
    // A rail is a list of text links, never a stack of buttons, so the appearance select is
    // dropped rather than offered and then ignored by the renderer. `required: false` keeps a
    // half-filled row from blocking the page save; the renderer drops rows with no target.
    fields: (link({ appearances: false, required: false }) as GroupField).fields,
    label: {
      en: "Sidebar links",
      es: "Enlaces de la barra lateral",
    },
    localized: true,
    name: "sidebarLinks",
    type: "array",
  },
  {
    defaultValue: "right",
    label: {
      en: "Sidebar position",
      es: "Posición de la barra lateral",
    },
    name: "sidebarPosition",
    options: [
      {
        label: {
          en: "Left",
          es: "Izquierda",
        },
        value: "left",
      },
      {
        label: {
          en: "Right",
          es: "Derecha",
        },
        value: "right",
      },
    ],
    required: true,
    type: "select",
  },
];

export const SidebarSectionBlock: Block = injectSection({
  slug: "sidebarSection",
  interfaceName: "SidebarSectionBlock",
  ...getBlockPreviewImage("Sidebar Section"),
  labels: {
    plural: {
      en: "Sidebar Sections",
      es: "Secciones con Barra Lateral",
    },
    singular: {
      en: "Sidebar Section",
      es: "Sección con Barra Lateral",
    },
  },
  fields,
});
