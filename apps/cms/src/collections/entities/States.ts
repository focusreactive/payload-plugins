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
  ratingFields,
} from "./shared";

export const States: CollectionConfig<"states"> = {
  access: entityAccess,
  admin: entityAdmin({
    collection: "states",
    defaultColumns: ["name", "abbreviation", "slug", "updatedAt"],
    useAsTitle: "name",
  }),
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              fields: [
                {
                  admin: {
                    description: "The state's name as visitors read it, for example Texas.",
                    width: "70%",
                  },
                  label: "Name",
                  name: "name",
                  required: true,
                  type: "text",
                },
                {
                  admin: {
                    description: "Two letters, used in addresses, for example TX.",
                    width: "30%",
                  },
                  label: "Abbreviation",
                  maxLength: 2,
                  name: "abbreviation",
                  type: "text",
                },
              ],
              type: "row",
            },
            {
              admin: {
                description:
                  "The big heading at the top of the state's page. Empty uses the state's name.",
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
              admin: {
                description: "The photo behind the page heading. Empty shows a plain background.",
              },
              label: "Top image",
              name: "heroImage",
              relationTo: "media",
              type: "upload",
            },
            {
              admin: {
                description:
                  "The number visitors call for clinics in this state, for example 888-555-0100.",
              },
              label: "Phone",
              name: "phone",
              type: "text",
            },
            ratingFields,
            {
              admin: {
                allowCreate: false,
                description:
                  "Every clinic whose State is this one. Add a clinic to the state by editing the clinic.",
              },
              collection: "clinics",
              label: "Clinics in this state",
              name: "clinics",
              on: "state",
              type: "join",
            },
            entitySectionsField(
              "The sections of the state's page under its heading, top to bottom."
            ),
          ],
          label: "Content",
        },
        entitySeoTab,
      ],
      type: "tabs",
    },
    entitySlugField("The last part of the state page's URL, for example new-york."),
  ],
  hooks: entityHooks,
  labels: { plural: "States", singular: "State" },
  slug: "states",
  versions: entityVersions,
};
