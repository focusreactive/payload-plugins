import type { CollectionConfig } from "payload";

import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/core/constants/mediaDefaults";
import { anyone, or, user, superAdmin } from "@/core/lib/access";
import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/fields/link";

import { revalidateResourcesUsingFooter } from "./hooks/revalidateResourcesUsingFooter";

export const Footer: CollectionConfig<"footer"> = {
  access: {
    create: or(superAdmin, user),
    delete: or(superAdmin, user),
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    defaultColumns: ["name", "logo"],
    group: "Global Components",
    useAsTitle: "name",
  },
  fields: [
    {
      admin: {
        description: {
          en: "The name of the footer",
          es: "El nombre del footer",
        },
      },
      defaultValue: createLocalizedDefault({
        en: "Footer",
        es: "Pie de página",
      }),
      name: "name",
      required: true,
      type: "text",
    },
    {
      admin: {
        description: {
          en: "The logo to display in the footer",
          es: "El logo a mostrar en el footer",
        },
      },
      defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
      name: "logo",
      relationTo: "media",
      required: true,
      type: "upload",
    },
    {
      admin: {
        components: {
          RowLabel: "@/core/ui/components/RowLabel#RowLabelGroupName",
        },
        description: {
          en: "Footer navigation links (up to 10 items)",
          es: "Enlaces de navegación del footer (hasta 10 items)",
        },
        initCollapsed: true,
      },
      defaultValue: createLocalizedDefault({
        en: [{ link: { label: "Link", newTab: false, type: "custom", url: "#" } }, { link: { label: "Link", newTab: false, type: "custom", url: "#" } }],
        es: [
          {
            link: { label: "Enlace", newTab: false, type: "custom", url: "#" },
          },
          {
            link: { label: "Enlace", newTab: false, type: "custom", url: "#" },
          },
        ],
      }),
      fields: [
        link({
          appearances: false,
          overrides: {
            admin: {
              description: {
                en: "Link settings",
                es: "Configuración del enlace",
              },
            },
          },
        }),
      ],
      localized: true,
      maxRows: 10,
      minRows: 1,
      name: "links",
      type: "array",
    },
    {
      admin: {
        description: {
          en: "Footer body text",
          es: "Texto del footer",
        },
      },
      localized: true,
      name: "text",
      type: "richText",
    },
    {
      admin: {
        description: {
          en: "Copyright text shown at the bottom",
          es: "Texto de copyright al pie",
        },
      },
      defaultValue: createLocalizedDefault({
        en: "© 2025 All rights reserved",
        es: "© 2025 Todos los derechos reservados",
      }),
      localized: true,
      name: "copywriteText",
      type: "text",
    },
  ],
  hooks: {
    afterChange: [revalidateResourcesUsingFooter],
  },
  labels: {
    plural: {
      en: "Footers",
      es: "Pie de página",
    },
    singular: {
      en: "Footer",
      es: "Pie de página",
    },
  },
  slug: "footer",
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
