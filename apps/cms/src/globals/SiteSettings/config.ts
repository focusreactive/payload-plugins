import type { GlobalConfig } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { anyone, or, user, superAdmin } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { generateSeoFields } from "@/lib/utils/seoFields";
import { mauticFormFields } from "@/lib/fields/mauticFormFields";

import { revalidateSiteSettings } from "./hooks/revalidateSiteSettings";

export const SiteSettings: GlobalConfig = {
  access: {
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    group: "Settings",
  },
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              name: "siteName",
              type: "text",
              defaultValue: createLocalizedDefault(
                DEFAULT_VALUES.collections.siteSettings.siteName
              ),
              admin: {
                description: "The name of your website",
              },
              localized: true,
            },
          ],
          label: "General",
          name: "general",
        },
        {
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "logo",
                  type: "upload",
                  relationTo: "media",
                  label: "Admin Panel Logo",
                  admin: {
                    width: "50%",
                    description:
                      "Logo displayed in the admin panel sidebar (recommended: SVG or PNG, ~150x40px)",
                  },
                },
                {
                  name: "icon",
                  type: "upload",
                  relationTo: "media",
                  label: "Admin Panel Icon",
                  admin: {
                    width: "50%",
                    description:
                      "Icon displayed when sidebar is collapsed (recommended: SVG or PNG, 32x32px)",
                  },
                },
              ],
            },
          ],
          label: "Admin Panel",
          name: "adminPanel",
        },
        {
          fields: [
            {
              type: "group",
              label: "Title & Description",
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "titleSeparator",
                      type: "select",
                      label: "Title Separator",
                      defaultValue: "|",
                      options: [
                        { label: "| (pipe)", value: "|" },
                        { label: "- (dash)", value: "-" },
                        { label: "• (bullet)", value: "•" },
                      ],
                      admin: {
                        width: "50%",
                        description: "Character used to separate page title from site name",
                      },
                    },
                    {
                      name: "titleSuffix",
                      type: "text",
                      label: "Title Suffix",
                      admin: {
                        width: "50%",
                        description: "Text added after separator (defaults to Site Name if empty)",
                        placeholder: "Leave empty to use Site Name",
                      },
                      localized: true,
                      defaultValue: createLocalizedDefault(
                        DEFAULT_VALUES.collections.siteSettings.seoTitleSuffix
                      ),
                    },
                  ],
                },
                {
                  name: "defaultDescription",
                  type: "textarea",
                  label: "Default Meta Description",
                  admin: {
                    description: "Fallback description when page has no description",
                  },
                  defaultValue: createLocalizedDefault(
                    DEFAULT_VALUES.collections.siteSettings.defaultDescription
                  ),
                  localized: true,
                },
              ],
            },
            {
              name: "og",
              type: "group",
              label: "Open Graph",
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "title",
                      type: "text",
                      label: "Default OG Title",
                      admin: {
                        width: "50%",
                        description: "Fallback title for Open Graph when page has no title",
                      },
                      localized: true,
                    },
                    {
                      name: "siteName",
                      type: "text",
                      label: "OG Site Name",
                      admin: {
                        width: "50%",
                        description: "Site name for Open Graph. Defaults to Site Name if empty",
                        placeholder: "Leave empty to use Site Name",
                      },
                      localized: true,
                    },
                  ],
                },
                {
                  name: "description",
                  type: "textarea",
                  label: "Default OG Description",
                  admin: {
                    description:
                      "Fallback description for Open Graph (uses Meta Description if empty)",
                  },
                  localized: true,
                  defaultValue: createLocalizedDefault(
                    DEFAULT_VALUES.collections.siteSettings.defaultOgDescription
                  ),
                },
                {
                  name: "image",
                  type: "upload",
                  relationTo: "media",
                  label: "Default OG Image",
                  admin: {
                    description: "Fallback image for social media sharing",
                  },
                },
              ],
            },
            {
              name: "x",
              type: "group",
              label: "X (Twitter)",
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "site",
                      type: "text",
                      label: "Twitter Site Handle",
                      admin: {
                        width: "33%",
                        description: "Twitter/X username for the website (e.g., @yoursite)",
                        placeholder: "@yoursite",
                      },
                      localized: true,
                    },
                    {
                      name: "creator",
                      type: "text",
                      label: "Default Twitter Creator Handle",
                      admin: {
                        width: "33%",
                        description:
                          "Default Twitter/X username for content creator (e.g., @author)",
                        placeholder: "@author",
                      },
                      localized: true,
                    },
                    {
                      name: "card",
                      type: "select",
                      label: "Default Twitter Card Type",
                      defaultValue: "summary_large_image",
                      options: [
                        {
                          label: "Summary Card with Large Image",
                          value: "summary_large_image",
                        },
                        {
                          label: "Summary Card",
                          value: "summary",
                        },
                      ],
                      admin: {
                        width: "34%",
                        description: "Type of Twitter Card to display",
                      },
                    },
                  ],
                },
              ],
            },
          ],
          label: "SEO Defaults",
          name: "seo",
        },
        {
          fields: [
            {
              name: "header",
              type: "relationship",
              relationTo: "header",
            },
            {
              name: "title",
              type: "text",
              label: "404 Title",
              localized: true,
              defaultValue: createLocalizedDefault(
                DEFAULT_VALUES.collections.siteSettings.notFoundTitle
              ),
            },
            {
              name: "description",
              type: "textarea",
              label: "404 Description",
              defaultValue: createLocalizedDefault(
                DEFAULT_VALUES.collections.siteSettings.notFoundDescription
              ),
              localized: true,
            },
            {
              name: "footer",
              type: "relationship",
              relationTo: "footer",
            },
          ],
          label: "404 Page",
          name: "notFound",
        },
        {
          fields: [
            {
              type: "tabs",
              tabs: [
                {
                  label: "Content",
                  fields: [
                    {
                      name: "header",
                      type: "relationship",
                      relationTo: "header",
                    },
                    {
                      type: "row",
                      fields: [
                        {
                          admin: { width: "40%" },
                          defaultValue: createLocalizedDefault({
                            en: "Blog",
                          }),
                          label: "Eyebrow",
                          localized: true,
                          name: "eyebrow",
                          type: "text",
                        },
                        {
                          admin: { width: "60%" },
                          name: "title",
                          type: "text",
                          required: true,
                          defaultValue: createLocalizedDefault(
                            DEFAULT_VALUES.collections.siteSettings.blog.blogTitle
                          ),
                          localized: true,
                          label: "Blog Page Title",
                        },
                      ],
                    },
                    {
                      name: "description",
                      type: "textarea",
                      required: true,
                      localized: true,
                      label: "Blog Page Description",
                      defaultValue: createLocalizedDefault(
                        DEFAULT_VALUES.collections.siteSettings.blog.blogDescription
                      ),
                    },
                    {
                      type: "row",
                      fields: [
                        {
                          admin: { width: "50%" },
                          defaultValue: createLocalizedDefault({
                            en: "Search articles…",
                          }),
                          label: "Search placeholder",
                          localized: true,
                          name: "searchPlaceholder",
                          type: "text",
                        },
                        {
                          admin: { width: "50%" },
                          name: "readMoreLabel",
                          type: "text",
                          required: true,
                          label: "Read More Button Label",
                          localized: true,
                          defaultValue: createLocalizedDefault(
                            DEFAULT_VALUES.collections.siteSettings.blog.readMoreLabel
                          ),
                        },
                      ],
                    },
                    {
                      name: "relatedPostsLabel",
                      type: "text",
                      required: true,
                      label: "Related Posts Label",
                      localized: true,
                      defaultValue: createLocalizedDefault(
                        DEFAULT_VALUES.collections.siteSettings.blog.relatedPostsLabel
                      ),
                    },
                    {
                      name: "footer",
                      type: "relationship",
                      relationTo: "footer",
                    },
                  ],
                },
                {
                  label: "SEO",
                  fields: [
                    {
                      name: "meta",
                      type: "group",
                      label: false,
                      fields: generateSeoFields(),
                      localized: true,
                    },
                  ],
                },
              ],
            },
          ],
          label: "Blog",
          name: "blog",
        },
        {
          fields: [
            {
              admin: {
                description:
                  "Base URL of your Mautic instance, e.g. https://mautic.example.com. Form and newsletter blocks submit there.",
              },
              label: "Mautic URL",
              name: "mauticUrl",
              type: "text",
              validate: (value: unknown) =>
                !value || (typeof value === "string" && /^https:\/\/[^\s/]+/u.test(value))
                  ? true
                  : "Use an https:// URL",
            },
            {
              admin: {
                description:
                  "The Mautic form behind every newsletter band (blocks, blog, author pages)",
              },
              fields: [mauticFormFields({ required: false })],
              label: "Newsletter form",
              name: "newsletterForm",
              type: "group",
            },
          ],
          label: "Integrations",
          name: "integrations",
        },
      ],
      type: "tabs",
    },
  ],
  hooks: {
    afterChange: [revalidateSiteSettings],
  },
  label: "Site Settings",
  slug: "site-settings",
  versions: {
    drafts: true,
  },
};
