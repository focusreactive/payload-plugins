import { slugField as payloadSlugField } from "payload";
import type { CollectionConfig } from "payload";

import { anyone, or, superAdmin, user } from "@/lib/access";

import { revalidateReferencingPages } from "./hooks/revalidateReferencingPages";

/**
 * The second axis of the programmatic model. Narrative hints are generation
 * inputs: the AI weaves them into the traveller story for this city.
 *
 * Labels are plain strings on purpose: object labels render as
 * "[object Object]" in list-view sort buttons and create tooltips.
 */
export const Cities: CollectionConfig = {
  access: {
    create: or(superAdmin, user),
    delete: or(superAdmin, user),
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    defaultColumns: ["title", "country", "updatedAt"],
    group: "Programmatic Content",
    useAsTitle: "title",
  },
  fields: [
    {
      label: "City name",
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    {
      label: "Country",
      localized: true,
      name: "country",
      required: true,
      type: "text",
    },
    {
      admin: {
        description:
          "Local color the AI weaves into generated narratives - landmarks, neighbourhoods, food.",
      },
      fields: [
        {
          label: "Hint",
          name: "hint",
          required: true,
          type: "text",
        },
      ],
      label: "Narrative hints",
      name: "narrativeHints",
      type: "array",
    },
    payloadSlugField({ required: true, useAsSlug: "title" }),
  ],
  hooks: {
    afterChange: [revalidateReferencingPages("city")],
  },
  labels: {
    plural: "Cities",
    singular: "City",
  },
  slug: "cities",
};
