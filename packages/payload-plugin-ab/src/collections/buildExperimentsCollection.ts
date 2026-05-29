import type { CollectionConfig } from "payload";

export function buildExperimentsCollection(debug: boolean, slug: string): CollectionConfig {
  return {
    slug,
    admin: {
      hidden: !debug,
      useAsTitle: "manifestKey",
      defaultColumns: ["manifestKey", "parentCollection", "locale", "startedAt"],
    },
    access: {
      read: () => true,
    },
    fields: [
      {
        name: "manifestKey",
        type: "text",
        required: true,
        index: true,
        admin: { description: "Internal URL path used as the experiment id; matches GA4 fr_ab_experiment." },
      },
      {
        name: "parentDocId",
        type: "text",
        required: true,
        admin: { description: "ID of the original (non-variant) document." },
      },
      {
        name: "parentCollection",
        type: "text",
        required: true,
      },
      {
        name: "locale",
        type: "text",
        admin: { description: "Locale this experiment row is scoped to; null when localization is disabled." },
      },
      {
        name: "startedAt",
        type: "date",
        required: true,
        admin: { description: "Set to now() when the first variant for this parent+locale is published." },
      },
    ],
  };
}
