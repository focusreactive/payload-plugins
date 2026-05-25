import type { CollectionConfig } from "payload";

import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/core/constants/mediaDefaults";
import { anyone, or, user, superAdmin } from "@/core/lib/access";
import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/fields/link";

import { revalidateResourcesUsingHeader } from "./hooks/revalidateResourcesUsingHeader";

export const Header: CollectionConfig<"header"> = {
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
          en: "The name of the header",
          es: "El nombre del header",
        },
      },
      defaultValue: createLocalizedDefault({ en: "Header", es: "Header" }),
      localized: true,
      name: "name",
      type: "text",
    },
    {
      admin: {
        description: {
          en: "The logo to display in the header",
          es: "El logo a mostrar en el header",
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
          en: "Navigation items in the header (up to 6 items)",
          es: "Items de navegación en el header (hasta 6 items)",
        },
        initCollapsed: true,
      },
      defaultValue: createLocalizedDefault({
        en: [
          {
            link: { label: "Link 1", newTab: false, type: "custom", url: "#" },
          },
          {
            link: { label: "Link 2", newTab: false, type: "custom", url: "#" },
          },
        ],
        es: [
          {
            link: {
              label: "Enlace 1",
              newTab: false,
              type: "custom",
              url: "#",
            },
          },
          {
            link: {
              label: "Enlace 2",
              newTab: false,
              type: "custom",
              url: "#",
            },
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
      maxRows: 6,
      name: "navItems",
      type: "array",
    },
  ],
  hooks: {
    afterChange: [revalidateResourcesUsingHeader],
  },
  labels: {
    plural: {
      en: "Headers",
      es: "Headers",
    },
    singular: {
      en: "Header",
      es: "Header",
    },
  },
  slug: "header",
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
