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

export const Conditions: CollectionConfig<"conditions"> = {
  access: entityAccess,
  admin: entityAdmin({
    collection: "conditions",
    defaultColumns: ["title", "slug", "updatedAt"],
    useAsTitle: "title",
  }),
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              admin: { description: "The condition's name, for example Spider Veins." },
              label: "Name",
              localized: true,
              name: "title",
              required: true,
              type: "text",
            },
            {
              admin: {
                description: "The round drawing shown wherever conditions are listed.",
              },
              label: "Icon",
              name: "icon",
              relationTo: "media",
              type: "upload",
            },
            {
              admin: {
                description:
                  "The big heading at the top of the condition's page. Empty uses the name.",
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
              admin: { description: "The photo at the top of the condition's page." },
              label: "Top image",
              name: "heroImage",
              relationTo: "media",
              type: "upload",
            },
            {
              admin: {
                allowCreate: false,
                description:
                  "Every treatment whose Treats list includes this condition. Change it by editing the treatment.",
              },
              collection: "treatments",
              label: "Treatments for this condition",
              name: "treatments",
              on: "conditions",
              type: "join",
            },
            entitySectionsField(
              "The sections of the condition's page under its heading, top to bottom."
            ),
          ],
          label: "Content",
        },
        entitySeoTab,
      ],
      type: "tabs",
    },
    entitySlugField("The last part of the condition page's URL, for example spider-veins."),
    {
      admin: {
        description: "Lower numbers come first in condition lists.",
        position: "sidebar",
      },
      defaultValue: 100,
      label: "Order in the list",
      name: "listOrder",
      type: "number",
    },
  ],
  hooks: entityHooks,
  labels: { plural: "Conditions", singular: "Condition" },
  slug: "conditions",
  versions: entityVersions,
};
