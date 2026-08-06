import { slugField as payloadSlugField } from "payload";
import type { CollectionConfig } from "payload";

import { anyone, or, superAdmin, user } from "@/lib/access";

import { revalidateReferencingPages } from "./hooks/revalidateReferencingPages";

/**
 * Entity-first programmatic content: a condition owns the copy shared by every
 * city page that references it (intro, symptoms, FAQ). Edit here once - every
 * generated page re-renders with the change.
 *
 * Labels are plain strings on purpose: object labels render as
 * "[object Object]" in list-view sort buttons and create tooltips.
 */
export const Conditions: CollectionConfig = {
  access: {
    create: or(superAdmin, user),
    delete: or(superAdmin, user),
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    defaultColumns: ["title", "slug", "updatedAt"],
    group: "Programmatic Content",
    useAsTitle: "title",
  },
  fields: [
    {
      label: "Condition name",
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    {
      admin: {
        description: "Shared introduction rendered on every city page for this condition.",
      },
      label: "Shared intro",
      localized: true,
      name: "intro",
      required: true,
      type: "textarea",
    },
    {
      fields: [
        {
          label: "Symptom",
          name: "symptom",
          required: true,
          type: "text",
        },
      ],
      label: "Symptoms",
      localized: true,
      name: "symptoms",
      type: "array",
    },
    {
      admin: { initCollapsed: true },
      fields: [
        {
          label: "Question",
          name: "question",
          required: true,
          type: "text",
        },
        {
          label: "Answer",
          name: "answer",
          required: true,
          type: "textarea",
        },
      ],
      label: "FAQ",
      localized: true,
      name: "faq",
      type: "array",
    },
    payloadSlugField({ required: true, useAsSlug: "title" }),
    {
      admin: {
        components: {
          Field: "/components/admin/BatchGenerateActions#BatchGenerateForCondition",
        },
      },
      name: "batchGenerateActions",
      type: "ui",
    },
  ],
  hooks: {
    afterChange: [revalidateReferencingPages("condition")],
  },
  labels: {
    plural: "Conditions",
    singular: "Condition",
  },
  slug: "conditions",
};
