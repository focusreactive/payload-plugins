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

export const Doctors: CollectionConfig<"doctors"> = {
  access: entityAccess,
  admin: entityAdmin({
    collection: "doctors",
    defaultColumns: ["name", "jobTitle", "clinics", "updatedAt"],
    useAsTitle: "name",
  }),
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              admin: {
                description: "The doctor's name as visitors read it, for example Dr. Jane Smith.",
              },
              label: "Name",
              name: "name",
              required: true,
              type: "text",
            },
            {
              admin: {
                description:
                  "The line under the doctor's name, for example Board-Certified Physician and Vein Specialist.",
              },
              label: "Job title",
              localized: true,
              name: "jobTitle",
              type: "text",
            },
            {
              admin: {
                description:
                  "A short badge over the doctor's photo, for example Chief Medical Officer. Empty shows no badge.",
              },
              label: "Badge",
              localized: true,
              name: "featuredLabel",
              type: "text",
            },
            {
              admin: {
                description: "The round photo used on cards, sliders and article bylines.",
              },
              label: "Photo",
              name: "photo",
              relationTo: "media",
              type: "upload",
            },
            {
              admin: {
                description:
                  "The large photo at the top of the doctor's page. Empty uses the round photo.",
              },
              label: "Top image",
              name: "heroImage",
              relationTo: "media",
              type: "upload",
            },
            bodyRichText({
              description: "The doctor's biography, shown on the doctor's page.",
              label: "Biography",
              localized: true,
              name: "bio",
            }),
            entitySectionsField(
              "The sections of the doctor's page under the biography, top to bottom."
            ),
          ],
          label: "Content",
        },
        {
          fields: [
            {
              admin: {
                description: "Letters after the name, one per entry, for example MD or FACS.",
              },
              hasMany: true,
              label: "Credentials",
              name: "credentials",
              type: "text",
            },
            {
              admin: { description: "Languages the doctor speaks with patients, one per entry." },
              hasMany: true,
              label: "Languages",
              name: "languages",
              type: "text",
            },
            {
              admin: {
                description: "What the doctor treats, one per entry, for example Sclerotherapy.",
              },
              hasMany: true,
              label: "Specialties",
              name: "specialties",
              type: "text",
            },
            {
              admin: {
                components: { RowLabel: "@/components/admin/RowLabel#RowLabel" },
                description:
                  "Schools, residencies and fellowships, in the order shown on the page.",
                initCollapsed: true,
              },
              fields: [
                {
                  fields: [
                    {
                      admin: { width: "65%" },
                      label: "Institution",
                      name: "name",
                      required: true,
                      type: "text",
                    },
                    {
                      admin: { width: "35%" },
                      defaultValue: "school",
                      label: "Kind",
                      name: "kind",
                      options: [
                        { label: "College or university", value: "school" },
                        { label: "Hospital", value: "hospital" },
                      ],
                      type: "select",
                    },
                  ],
                  type: "row",
                },
              ],
              label: "Training",
              labels: { plural: "Institutions", singular: "Institution" },
              name: "education",
              type: "array",
            },
            {
              admin: {
                description:
                  "The doctor's National Provider Identifier, sent to search engines, for example 1982286456.",
              },
              label: "NPI number",
              name: "npi",
              type: "text",
            },
            {
              admin: {
                description:
                  "The doctor's profiles on other websites, full URLs, one per entry, for example https://www.healthgrades.com/physician/dr-jane-smith.",
              },
              hasMany: true,
              label: "Profile URLs",
              name: "profiles",
              type: "text",
            },
          ],
          label: "Credentials",
        },
        entitySeoTab,
      ],
      type: "tabs",
    },
    entitySlugField("The last part of the doctor page's URL, for example dr-jane-smith."),
    {
      admin: {
        description:
          "The clinics this doctor works at. Each clinic's page and its state's page list the doctor.",
        position: "sidebar",
      },
      hasMany: true,
      label: "Clinics",
      name: "clinics",
      relationTo: "clinics",
      type: "relationship",
    },
  ],
  hooks: entityHooks,
  labels: { plural: "Doctors", singular: "Doctor" },
  slug: "doctors",
  versions: entityVersions,
};
