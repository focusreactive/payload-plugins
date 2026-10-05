import type { CollectionConfig } from "payload";

import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { anyone, or, user, superAdmin } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/lib/fields/link";

import { revalidateResourcesUsingFooter } from "./hooks/revalidateResourcesUsingFooter";
import { denyPublishForAuthors } from "@/lib/hooks/denyPublishForAuthors";

export const Footer: CollectionConfig<"footer"> = {
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
        description: "The name of the footer",
      },
      defaultValue: createLocalizedDefault({
        en: "Footer",
      }),
      name: "name",
      required: true,
      type: "text",
    },
    {
      admin: {
        description: "The logo to display in the footer",
      },
      defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
      name: "logo",
      relationTo: "media",
      required: true,
      type: "upload",
    },
    {
      label: "Description",
      localized: true,
      name: "description",
      type: "text",
    },
    {
      admin: {
        components: { RowLabel: "@/components/admin/RowLabel#RowLabelGroupName" },
        initCollapsed: true,
      },
      defaultValue: createLocalizedDefault({
        en: [
          {
            label: "Product",
            links: [
              { link: { label: "Features", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Pricing", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Changelog", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Integrations", newTab: false, type: "custom", url: "#" } },
            ],
          },
          {
            label: "Company",
            links: [
              { link: { label: "About", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Blog", newTab: false, type: "custom", url: "/blog" } },
              { link: { label: "Careers", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Contact", newTab: false, type: "custom", url: "#" } },
            ],
          },
          {
            label: "Resources",
            links: [
              { link: { label: "Docs", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Community", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Status", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Security", newTab: false, type: "custom", url: "#" } },
            ],
          },
        ],
      }),
      fields: [
        {
          label: "Group label",
          localized: true,
          name: "label",
          required: true,
          type: "text",
        },
        {
          admin: { initCollapsed: true },
          fields: [link({ appearances: false })],
          minRows: 1,
          name: "links",
          required: true,
          type: "array",
        },
      ],
      localized: true,
      maxRows: 4,
      name: "linkGroups",
      type: "array",
    },
    {
      admin: { initCollapsed: true },
      fields: [link({ appearances: false })],
      label: "Legal links",
      localized: true,
      maxRows: 4,
      name: "legalLinks",
      type: "array",
    },
    {
      admin: {
        description: "Social profiles shown as icons in the footer",
        initCollapsed: true,
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              admin: { width: "35%" },
              label: "Platform",
              name: "platform",
              options: [
                { label: "LinkedIn", value: "linkedin" },
                { label: "Mastodon", value: "mastodon" },
                { label: "Bluesky", value: "bluesky" },
                { label: "YouTube", value: "youtube" },
              ],
              required: true,
              type: "select",
            },
            {
              admin: { width: "65%" },
              label: "URL",
              name: "url",
              required: true,
              type: "text",
            },
          ],
        },
      ],
      label: "Social links",
      maxRows: 6,
      name: "socialLinks",
      type: "array",
    },
    {
      admin: {
        description: "Certification chips, e.g. ISO 9001 with its certificate number",
        initCollapsed: true,
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              admin: { width: "40%" },
              label: "Label",
              name: "label",
              required: true,
              type: "text",
            },
            {
              admin: { width: "60%" },
              label: "Certificate number",
              name: "certificate",
              type: "text",
            },
          ],
        },
      ],
      label: "Certifications",
      maxRows: 4,
      name: "isoBadges",
      type: "array",
    },
    {
      admin: {
        description: "Copyright text shown at the bottom",
      },
      defaultValue: createLocalizedDefault({
        en: "© 2026 Cadence Labs, Inc.",
      }),
      localized: true,
      name: "copyrightText",
      type: "text",
    },
  ],
  hooks: {
    afterChange: [revalidateResourcesUsingFooter],
    beforeChange: [denyPublishForAuthors],
  },
  labels: {
    plural: "Footers",
    singular: "Footer",
  },
  slug: "footer",
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
