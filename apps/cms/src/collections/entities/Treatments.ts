import type { CollectionConfig } from "payload";

import { bodyRichText } from "@/lib/fields/site/richText";

import {
  entityAccess,
  entityAdmin,
  entityHooks,
  entitySectionsField,
  entitySeoTab,
  entitySlugField,
  entityVersions,
} from "./shared";

export const Treatments: CollectionConfig<"treatments"> = {
  access: entityAccess,
  admin: entityAdmin({
    collection: "treatments",
    defaultColumns: ["title", "summary", "slug", "updatedAt"],
    useAsTitle: "title",
  }),
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              admin: { description: "The treatment's name, for example Sclerotherapy." },
              label: "Name",
              localized: true,
              name: "title",
              required: true,
              type: "text",
            },
            {
              admin: {
                description:
                  "One line under the name on treatment cards, for example A vein treatment using an injectable medicine.",
              },
              label: "Card text",
              localized: true,
              name: "summary",
              type: "text",
            },
            {
              admin: { description: "The picture on the treatment's card in sliders and lists." },
              label: "Card image",
              name: "cardImage",
              relationTo: "media",
              type: "upload",
            },
            {
              admin: {
                description:
                  "The big heading at the top of the treatment's page. Empty uses the name.",
              },
              label: "Page heading",
              localized: true,
              name: "heroTitle",
              type: "text",
            },
            bodyRichText({
              description: "The paragraphs under the page heading.",
              label: "Introduction",
              localized: true,
              name: "heroIntro",
            }),
            {
              admin: { description: "The photo at the top of the treatment's page." },
              label: "Top image",
              name: "heroImage",
              relationTo: "media",
              type: "upload",
            },
            entitySectionsField(
              "The sections of the treatment's page under its heading, top to bottom."
            ),
          ],
          label: "Content",
        },
        entitySeoTab,
      ],
      type: "tabs",
    },
    entitySlugField("The last part of the treatment page's URL, for example sclerotherapy."),
    {
      admin: {
        description:
          "The conditions this treatment helps. Each condition's page lists the treatment.",
        position: "sidebar",
      },
      hasMany: true,
      label: "Treats",
      name: "conditions",
      relationTo: "conditions",
      type: "relationship",
    },
    {
      admin: {
        description: "Lower numbers come first in treatment lists and sliders.",
        position: "sidebar",
      },
      defaultValue: 100,
      label: "Order in the list",
      name: "listOrder",
      type: "number",
    },
  ],
  hooks: entityHooks,
  labels: { plural: "Treatments", singular: "Treatment" },
  slug: "treatments",
  versions: entityVersions,
};
