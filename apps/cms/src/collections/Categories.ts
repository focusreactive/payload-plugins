import type { CollectionConfig } from "payload";
import { slugField } from "payload";

import { DEFAULT_VALUES } from "@/core/constants/defaultValues";
import { anyone, author, or, superAdmin, user } from "@/core/lib/access";
import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";

export const Categories: CollectionConfig<"categories"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["title"],
    group: "Blog",
    useAsTitle: "title",
  },
  fields: [
    {
      defaultValue: createLocalizedDefault(DEFAULT_VALUES.collections.categories.title),
      label: {
        en: "Title",
        es: "Título",
      },
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    slugField({
      overrides: (field) => {
        const slugSub = field.fields?.[1] as { unique?: boolean } | undefined;
        if (slugSub && "unique" in slugSub) {
          slugSub.unique = false;
        }
        return field;
      },
      required: true,
      useAsSlug: "title",
    }),
  ],
  labels: {
    plural: {
      en: "Categories",
      es: "Categorías",
    },
    singular: {
      en: "Category",
      es: "Categoría",
    },
  },
  slug: "categories",
};
