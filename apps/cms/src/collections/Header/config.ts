import type { CollectionConfig, GroupField } from "payload";

import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { anyone, or, user, superAdmin } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/lib/fields/link";

import { revalidateResourcesUsingHeader } from "./hooks/revalidateResourcesUsingHeader";
import { denyPublishForAuthors } from "@/lib/hooks/denyPublishForAuthors";

export const Header: CollectionConfig<"header"> = {
  access: {
    create: or(superAdmin, user),
    // Only administrators delete content (§5.7).
    delete: superAdmin,
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
        description: "The name of the header",
      },
      defaultValue: createLocalizedDefault({ en: "Header" }),
      localized: true,
      name: "name",
      type: "text",
    },
    {
      admin: {
        description: "The logo to display in the header",
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
          RowLabel: "@/components/admin/RowLabel#RowLabel",
        },
        initCollapsed: true,
      },
      defaultValue: createLocalizedDefault({
        en: [
          {
            type: "link",
            link: { label: "Blog", newTab: false, type: "custom", url: "/updates.html" },
          },
          { type: "link", link: { label: "Pricing", newTab: false, type: "custom", url: "#" } },
        ],
      }),
      fields: [
        {
          type: "row",
          fields: [
            {
              admin: { width: "60%" },
              label: "Label",
              localized: true,
              name: "label",
              required: true,
              type: "text",
            },
            {
              admin: { width: "40%" },
              defaultValue: "link",
              label: "Type",
              name: "type",
              options: [
                { label: "Link", value: "link" },
                { label: "Dropdown", value: "dropdown" },
              ],
              required: true,
              type: "select",
            },
          ],
        },
        link({
          appearances: false,
          disableLabel: true,
          overrides: {
            admin: { condition: (_, siblingData) => siblingData?.type === "link" },
          },
        }),
        {
          admin: { condition: (_, siblingData) => siblingData?.type === "dropdown" },
          fields: [
            {
              fields: [
                {
                  defaultValue: false,
                  label: "Enabled",
                  name: "enabled",
                  type: "checkbox",
                },
                {
                  type: "row",
                  admin: { condition: (_, siblingData) => !!siblingData?.enabled },
                  fields: [
                    {
                      admin: { width: "40%" },
                      label: "Eyebrow",
                      localized: true,
                      name: "eyebrow",
                      type: "text",
                    },
                    {
                      admin: { width: "60%" },
                      label: "Title",
                      localized: true,
                      name: "title",
                      type: "text",
                    },
                  ],
                },
                {
                  admin: { condition: (_, siblingData) => !!siblingData?.enabled },
                  label: "Description",
                  localized: true,
                  name: "description",
                  type: "textarea",
                },
                link({
                  appearances: false,
                  customPageDbName: "hdr_ni_dd_ft_lnk_cp",
                  required: false,
                  overrides: {
                    admin: { condition: (_, siblingData) => !!siblingData?.enabled },
                  },
                }),
              ],
              label: "Featured card",
              name: "featured",
              type: "group",
            },
            {
              admin: { initCollapsed: true },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      admin: { width: "50%" },
                      label: "Title",
                      localized: true,
                      name: "title",
                      required: true,
                      type: "text",
                    },
                    {
                      admin: { width: "50%" },
                      label: "Description",
                      localized: true,
                      name: "description",
                      type: "text",
                    },
                  ],
                },
                link({
                  appearances: false,
                  customPageDbName: "hdr_ni_dd_lnks_lnk_cp",
                  disableLabel: true,
                }),
              ],
              label: "Menu links",
              minRows: 1,
              name: "links",
              type: "array",
            },
          ],
          label: "Dropdown",
          name: "dropdown",
          type: "group",
        },
      ],
      localized: true,
      maxRows: 6,
      name: "navItems",
      type: "array",
    },
    {
      admin: {
        description: "The single button at the right of the header, e.g. Contact us",
        initCollapsed: true,
      },
      fields: (link() as GroupField).fields,
      label: "Button",
      localized: true,
      maxRows: 1,
      name: "actions",
      type: "array",
    },
  ],
  hooks: {
    afterChange: [revalidateResourcesUsingHeader],
    beforeChange: [denyPublishForAuthors],
  },
  labels: {
    plural: "Headers",
    singular: "Header",
  },
  slug: "header",
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
