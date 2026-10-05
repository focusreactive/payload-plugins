import type { CollectionConfig } from "payload";
import { slugField } from "payload";

import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { CAREERS_CONFIG } from "@/lib/config/careers";
import { mauticFormFields } from "@/lib/fields/mauticFormFields";
import { denyPublishForAuthors } from "@/lib/hooks/denyPublishForAuthors";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { generateRichText } from "@/lib/utils/generateRichText";
import { generateSeoFields } from "@/lib/utils/seoFields";
import { buildUrl } from "@/lib/utils/path/buildUrl";

import { revalidateVacancy, revalidateVacancyDelete } from "./hooks/revalidateVacancy";
import { EMPLOYMENT_TYPE_OPTIONS, WORKPLACE_OPTIONS } from "./options";

function previewPath(slug: string | null | undefined, locale: string) {
  return generatePreviewPath({
    collection: CAREERS_CONFIG.collection,
    path: buildUrl({ absolute: false, collection: "vacancies", locale, slug }),
    slug: slug ?? "",
  });
}

export const Vacancies: CollectionConfig<"vacancies"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: superAdmin,
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    components: {
      edit: {
        PreviewButton: "/components/admin/VisualPreviewButton#VisualPreviewButton",
      },
    },
    defaultColumns: ["title", "department", "location", "_status", "updatedAt"],
    group: "Careers Hub",
    livePreview: {
      url: ({ data, locale }) => previewPath(data?.slug, locale.code ?? locale.fallbackLocale),
    },
    preview: (data, { locale }) => previewPath(data?.slug as string, locale),
    useAsTitle: "title",
  },
  defaultPopulate: {
    department: true,
    employmentType: true,
    location: true,
    slug: true,
    summary: true,
    title: true,
    workplace: true,
  },
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              label: "Title",
              localized: true,
              name: "title",
              required: true,
              type: "text",
            },
            {
              admin: {
                description: "One or two sentences for the careers list and search results",
              },
              label: "Summary",
              localized: true,
              maxLength: 300,
              name: "summary",
              required: true,
              type: "textarea",
            },
            {
              editor: generateRichText("default"),
              label: "Description",
              localized: true,
              name: "description",
              required: true,
              type: "richText",
            },
          ],
          label: "Content",
        },
        {
          description:
            "Candidates apply through this Mautic form (fields: name, email, linkedin, message, consent). Without one, the page shows the email below.",
          fields: [
            mauticFormFields({ required: false }),
            {
              admin: { description: "Fallback when no Mautic form is set, e.g. jobs@example.com" },
              label: "Application email",
              name: "email",
              type: "email",
            },
          ],
          label: "Application",
          name: "apply",
        },
        {
          fields: generateSeoFields(),
          label: "SEO",
          localized: true,
          name: "meta",
        },
      ],
      type: "tabs",
    },
    slugField({ required: true, useAsSlug: "title" }),
    {
      admin: { position: "sidebar" },
      label: "Department",
      localized: true,
      name: "department",
      type: "text",
    },
    {
      admin: { description: "e.g. Manchester, UK", position: "sidebar" },
      label: "Location",
      localized: true,
      name: "location",
      type: "text",
    },
    {
      admin: { position: "sidebar" },
      defaultValue: "hybrid",
      label: "Workplace",
      name: "workplace",
      options: [...WORKPLACE_OPTIONS],
      required: true,
      type: "select",
    },
    {
      admin: { position: "sidebar" },
      defaultValue: "fullTime",
      label: "Employment type",
      name: "employmentType",
      options: [...EMPLOYMENT_TYPE_OPTIONS],
      required: true,
      type: "select",
    },
    {
      admin: { date: { pickerAppearance: "dayOnly" }, position: "sidebar" },
      defaultValue: () => new Date().toISOString(),
      label: "Posted on",
      name: "publishedAt",
      type: "date",
    },
    {
      admin: {
        date: { pickerAppearance: "dayOnly" },
        description: "The role leaves the careers list after this day",
        position: "sidebar",
      },
      label: "Closes on",
      name: "closesAt",
      type: "date",
    },
  ],
  hooks: {
    afterChange: [revalidateVacancy],
    afterDelete: [revalidateVacancyDelete],
    beforeChange: [denyPublishForAuthors],
  },
  labels: {
    plural: "Vacancies",
    singular: "Vacancy",
  },
  slug: CAREERS_CONFIG.collection,
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
